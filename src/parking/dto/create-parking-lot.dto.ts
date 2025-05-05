import { IsInt, Min } from 'class-validator';

export class CreateParkingLotDto {
  @IsInt()
  @Min(1)
  capacity: number;
}