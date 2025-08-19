-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "public"."Ticket"("eventId");

-- CreateIndex
CREATE INDEX "Ticket_state_idx" ON "public"."Ticket"("state");

-- CreateIndex
CREATE INDEX "Ticket_expiresAt_idx" ON "public"."Ticket"("expiresAt");

-- CreateIndex
CREATE INDEX "Ticket_eventId_state_idx" ON "public"."Ticket"("eventId", "state");

-- CreateIndex
CREATE INDEX "events_active_idx" ON "public"."events"("active");

-- CreateIndex
CREATE INDEX "events_startsAt_idx" ON "public"."events"("startsAt");

-- CreateIndex
CREATE INDEX "events_active_startsAt_idx" ON "public"."events"("active", "startsAt");
