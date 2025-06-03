/*
  Warnings:

  - You are about to drop the `_BookingToSeat` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_BookingToSeat" DROP CONSTRAINT "_BookingToSeat_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookingToSeat" DROP CONSTRAINT "_BookingToSeat_B_fkey";

-- DropTable
DROP TABLE "_BookingToSeat";

-- CreateTable
CREATE TABLE "BookingSeat" (
    "bookingId" INTEGER NOT NULL,
    "seatId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSeat_pkey" PRIMARY KEY ("bookingId","seatId")
);

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeat" ADD CONSTRAINT "BookingSeat_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
