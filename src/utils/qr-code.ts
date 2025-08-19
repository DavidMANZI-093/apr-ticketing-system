import crypto from "crypto";
import { Ticket } from "../../generated/prisma";

export const generateSecureQRData = (ticket: Ticket): string => {
	const payload = {
		t: ticket.id,
		e: ticket.eventId,
		s: ticket.seatId,
		ts: Date.now(), // timestamp
	};

	if (!process.env.QR_SECRET) {
		throw new Error("QR_SECRET is not defined");
	}

	const signature = crypto
		.createHmac("sha256", process.env.QR_SECRET)
		.update(JSON.stringify(payload))
		.digest("hex")
		.substring(0, 16); // First 16 characters of the signature

	return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`;
};
