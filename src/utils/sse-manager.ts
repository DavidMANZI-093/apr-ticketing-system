import { Response } from "express";
import { logger } from "./logger";
import { Seat } from "../types";

interface SSEConnection {
	res: Response;
	eventId: string;
	userId?: string;
	connectedAt: number;
	keepaliveInterval?: NodeJS.Timeout;
}

class SSEManager {
	private connections = new Map<string, Set<SSEConnection>>();
	private connectionCount = 0;

	// Add connection to event stream
	addConnection(eventId: string, res: Response, userId?: string): void {
		const connection: SSEConnection = {
			res,
			eventId,
			userId,
			connectedAt: Date.now(),
		};

		if (!this.connections.has(eventId)) {
			this.connections.set(eventId, new Set());
		}

		this.connections.get(eventId)!.add(connection);
		this.connectionCount++;

		logger.info("SSE connection established", {
			operation: "sseConnect",
			eventId,
			userId,
			totalConnections: this.connectionCount,
		});

		// Start keepalive for this connection
		this.startKeepalive(connection);

		// Handle connection cleanup
		res.on("close", () => {
			this.removeConnectionInternal(eventId, connection);
		});

		res.on("error", (error) => {
			logger.error("SSE connection error", error, {
				operation: "sseError",
				eventId,
				userId,
			});
			this.removeConnectionInternal(eventId, connection);
		});
	}

	// Start keepalive for a connection
	private startKeepalive(connection: SSEConnection): void {
		// Send keepalive every 25 minutes (before 30min timeout)
		connection.keepaliveInterval = setInterval(
			() => {
				try {
					const keepaliveMessage = JSON.stringify({
						type: "keepalive",
						timestamp: Date.now(),
					});
					connection.res.write(`data: ${keepaliveMessage}\n\n`);

					logger.info("SSE keepalive sent", {
						operation: "sseKeepalive",
						eventId: connection.eventId,
						userId: connection.userId,
					});
				} catch (error) {
					// Connection is dead, cleanup will be handled by broadcast error detection
					if (connection.keepaliveInterval) {
						clearInterval(connection.keepaliveInterval);
					}

					logger.error("SSE keepalive failed", error, {
						operation: "sseKeepaliveError",
						eventId: connection.eventId,
						userId: connection.userId,
					});
				}
			},
			5 * 60 * 1000,
		); // 5 minutes
	}

	// Remove connection (internal)
	private removeConnectionInternal(
		eventId: string,
		connection: SSEConnection,
	): void {
		const eventConnections = this.connections.get(eventId);
		if (eventConnections) {
			// Clear keepalive interval
			if (connection.keepaliveInterval) {
				clearInterval(connection.keepaliveInterval);
			}

			eventConnections.delete(connection);
			this.connectionCount--;

			// Clean up empty event sets
			if (eventConnections.size === 0) {
				this.connections.delete(eventId);
			}

			logger.info("SSE connection closed", {
				operation: "sseDisconnect",
				eventId,
				userId: connection.userId,
				duration: Date.now() - connection.connectedAt,
				totalConnections: this.connectionCount,
			});
		}
	}

	// Broadcast seating plan update to all connections for an event
	broadcastSeatingUpdate(
		eventId: string,
		seatingPlan: Record<string, Seat>,
	): void {
		const eventConnections = this.connections.get(eventId);
		if (!eventConnections || eventConnections.size === 0) {
			return;
		}

		const message = JSON.stringify({
			type: "seatingPlan",
			eventId,
			data: seatingPlan,
			timestamp: Date.now(),
		});

		const deadConnections: SSEConnection[] = [];

		eventConnections.forEach((connection) => {
			try {
				connection.res.write(`data: ${message}\n\n`);
			} catch (error) {
				logger.error("Failed to send SSE message", error, {
					operation: "sseBroadcast",
					eventId,
					userId: connection.userId,
				});
				deadConnections.push(connection);
			}
		});

		// Clean up dead connections
		deadConnections.forEach((connection) => {
			this.removeConnectionInternal(eventId, connection);
		});

		logger.info("Broadcasted seating update", {
			operation: "sseBroadcast",
			eventId,
			connectionsNotified: eventConnections.size - deadConnections.length,
			deadConnectionsRemoved: deadConnections.length,
		});
	}

	// Broadcast seat-level update (more efficient for single seat changes)
	broadcastSeatUpdate(
		eventId: string,
		seatId: string,
		isAvailable: boolean,
		price?: number,
		label?: string,
	): void {
		const eventConnections = this.connections.get(eventId);
		if (!eventConnections || eventConnections.size === 0) {
			return;
		}

		const message = JSON.stringify({
			type: "seatUpdate",
			eventId,
			data: {
				seatId,
				isAvailable,
				price,
				label,
			},
			timestamp: Date.now(),
		});

		const deadConnections: SSEConnection[] = [];

		eventConnections.forEach((connection) => {
			try {
				connection.res.write(`data: ${message}\n\n`);
			} catch (error) {
				logger.error("Failed to send SSE seat update", error, {
					operation: "sseSeatUpdate",
					eventId,
					seatId,
					userId: connection.userId,
				});
				deadConnections.push(connection);
			}
		});

		// Clean up dead connections
		deadConnections.forEach((connection) => {
			this.removeConnectionInternal(eventId, connection);
		});

		logger.info("Broadcasted seat update", {
			operation: "sseSeatUpdate",
			eventId,
			seatId,
			isAvailable,
			connectionsNotified: eventConnections.size - deadConnections.length,
		});
	}

	// Get connection statistics
	getStats() {
		return {
			totalConnections: this.connectionCount,
			eventsWithConnections: this.connections.size,
			connectionsByEvent: Array.from(this.connections.entries()).map(
				([eventId, connections]) => ({
					eventId,
					connections: connections.size,
				}),
			),
		};
	}

	// Clear all connections (for testing)
	clearAllConnections(): void {
		this.connections.clear();
		this.connectionCount = 0;
	}

	// Remove connection by response object
	removeConnection(eventId: string, res: Response): void {
		const eventConnections = this.connections.get(eventId);
		if (eventConnections) {
			const connectionToRemove = Array.from(eventConnections).find(
				(conn) => conn.res === res,
			);
			if (connectionToRemove) {
				eventConnections.delete(connectionToRemove);
				this.connectionCount--;

				if (eventConnections.size === 0) {
					this.connections.delete(eventId);
				}
			}
		}
	}

	// Cleanup stale connections (run periodically)
	cleanup(): void {
		let cleaned = 0;
		const now = Date.now();
		const maxAge = 1 * 60 * 60 * 1000; // 1 hour

		this.connections.forEach((eventConnections, eventId) => {
			const staleConnections: SSEConnection[] = [];

			eventConnections.forEach((connection) => {
				if (now - connection.connectedAt > maxAge) {
					staleConnections.push(connection);
				}
			});

			staleConnections.forEach((connection) => {
				try {
					connection.res.end();
				} catch (error) {
					// Connection already closed
				}
				this.removeConnectionInternal(eventId, connection);
				cleaned++;
			});
		});

		if (cleaned > 0) {
			logger.info("Cleaned up stale SSE connections", {
				operation: "sseCleanup",
				connectionsRemoved: cleaned,
			});
		}
	}
}

export const sseManager = new SSEManager();

// Cleanup stale connections every 10 minutes
setInterval(
	() => {
		sseManager.cleanup();
	},
	10 * 60 * 1000,
);
