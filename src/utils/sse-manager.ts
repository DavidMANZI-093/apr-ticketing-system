import { Response } from "express";
import { logger } from "./logger";

interface SSEConnection {
	res: Response;
	eventId: string;
	userId?: string;
	connectedAt: number;
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

		// Handle connection cleanup
		res.on("close", () => {
			this.removeConnection(eventId, connection);
		});

		res.on("error", (error) => {
			logger.error("SSE connection error", error, {
				operation: "sseError",
				eventId,
				userId,
			});
			this.removeConnection(eventId, connection);
		});
	}

	// Remove connection
	private removeConnection(eventId: string, connection: SSEConnection): void {
		const eventConnections = this.connections.get(eventId);
		if (eventConnections) {
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
	broadcastSeatingUpdate(eventId: string, seatingPlan: Record<string, any>): void {
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
			this.removeConnection(eventId, connection);
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
			this.removeConnection(eventId, connection);
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

	// Cleanup stale connections (run periodically)
	cleanup(): void {
		let cleaned = 0;
		const now = Date.now();
		const maxAge = 30 * 60 * 1000; // 30 minutes

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
				this.removeConnection(eventId, connection);
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
setInterval(() => {
	sseManager.cleanup();
}, 10 * 60 * 1000);