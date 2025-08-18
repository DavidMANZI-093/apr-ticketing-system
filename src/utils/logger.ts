interface LogContext {
	userId?: string;
	eventId?: string;
	ticketId?: string;
	teamId?: string;
	operation?: string;
	[key: string]: any;
}

interface ErrorDetails {
	message: string;
	stack?: string;
	code?: string;
	statusCode?: number;
}

class Logger {
	private formatError(error: unknown): ErrorDetails {
		if (error instanceof Error) {
			return {
				message: error.message,
				stack: error.stack,
				code: (error as any).code,
				statusCode: (error as any).statusCode,
			};
		}
		
		if (typeof error === 'string') {
			return { message: error };
		}
		
		return { message: 'Unknown error occurred' };
	}

	private formatLog(level: string, message: string, context?: LogContext, error?: unknown) {
		const timestamp = new Date().toISOString();
		const logEntry: Record<string, any> = {
			timestamp,
			level,
			message,
		};

		if (context) {
			logEntry.context = context;
		}

		if (error) {
			logEntry.error = this.formatError(error);
		}

		return JSON.stringify(logEntry, null, 2);
	}

	info(message: string, context?: LogContext) {
		console.log(this.formatLog('INFO', message, context));
	}

	warn(message: string, context?: LogContext) {
		console.warn(this.formatLog('WARN', message, context));
	}

	error(message: string, error?: unknown, context?: LogContext) {
		console.error(this.formatLog('ERROR', message, context, error));
	}

	debug(message: string, context?: LogContext) {
		if (process.env.NODE_ENV === 'development') {
			console.debug(this.formatLog('DEBUG', message, context));
		}
	}
}

export const logger = new Logger();
