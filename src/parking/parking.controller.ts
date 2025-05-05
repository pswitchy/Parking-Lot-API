import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    Delete,
    Query,
    Patch,
    HttpCode,
    HttpStatus,
    ParseIntPipe,
    UsePipes,
    ValidationPipe,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { ParkingService } from './parking.service';
  import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
  import { ExpandParkingLotDto } from './dto/expand-parking-lot.dto';
  import { ParkCarDto } from './dto/park-car.dto';
  
  @Controller('parking-lots') // Using plural resource name
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })) // Apply validation globally for this controller
  export class ParkingController {
    constructor(private readonly parkingService: ParkingService) {}
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    createParkingLot(@Body() createParkingLotDto: CreateParkingLotDto) {
      return this.parkingService.createParkingLot(createParkingLotDto.capacity);
    }
  
    @Patch()
    expandParkingLot(@Body() expandParkingLotDto: ExpandParkingLotDto) {
      return this.parkingService.expandParkingLot(expandParkingLotDto.addCapacity);
    }
  
    // --- Park/Unpark ---
    // Using a sub-resource 'parkings' to represent the act or state of parking
    @Post('parkings')
    @HttpCode(HttpStatus.CREATED)
    parkCar(@Body() parkCarDto: ParkCarDto) {
      return this.parkingService.parkCar(parkCarDto.registrationNumber, parkCarDto.color);
    }
  
    @Delete('parkings')
    @HttpCode(HttpStatus.OK)
    unparkCar(
      @Query('slotNumber') slotNumber?: string,
      @Query('registrationNumber') registrationNumber?: string,
    ) {
      if (slotNumber !== undefined) {
          // Attempt to parse, handle potential errors
          const slotNum = parseInt(slotNumber, 10);
          if (isNaN(slotNum)) {
              throw new BadRequestException('Invalid slot number format.');
          }
          return this.parkingService.unparkCarBySlot(slotNum);
      } else if (registrationNumber !== undefined) {
        return this.parkingService.unparkCarByRegistration(registrationNumber);
      } else {
        throw new BadRequestException('Provide either slotNumber or registrationNumber to unpark.');
      }
    }
  
    // --- Queries ---
  
    @Get('status')
    getStatus() {
      return this.parkingService.getStatus();
    }
  
    // GET /parking-lots/registrations?color=White
    @Get('registrations')
    getRegistrationNumbersByColor(@Query('color') color: string) {
       if (!color) {
          throw new BadRequestException('Query parameter "color" is required.');
      }
      return this.parkingService.getRegistrationNumbersByColor(color);
    }
  
   // GET /parking-lots/slots?color=White
   // GET /parking-lots/slots?registrationNumber=KA-01-HH-1234
    @Get('slots')
    getSlots(
        @Query('color') color?: string,
        @Query('registrationNumber') registrationNumber?: string
    ) {
      if (color !== undefined) {
        return this.parkingService.getSlotNumbersByColor(color);
      } else if (registrationNumber !== undefined) {
        return this.parkingService.getSlotByRegistrationNumber(registrationNumber);
      } else {
         throw new BadRequestException('Provide either "color" or "registrationNumber" query parameter.');
      }
    }
  
     // --- Optional Endpoint for Dev/Debug ---
     @Get('internal-state')
     getInternalState() {
         // Be careful exposing internal state in production
         return this.parkingService.getCurrentState();
     }
}