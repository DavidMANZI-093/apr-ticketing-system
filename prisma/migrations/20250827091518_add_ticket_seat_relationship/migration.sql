-- AddForeignKey
ALTER TABLE "public"."Tickets" ADD CONSTRAINT "Tickets_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."EventSeats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
