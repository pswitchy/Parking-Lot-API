import { Module } from '@nestjs/common';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';

@Module({
  controllers: [ParkingController],
  providers: [ParkingService], // ParkingService is self-contained, no external dependencies needed here
})
export class ParkingModule {}