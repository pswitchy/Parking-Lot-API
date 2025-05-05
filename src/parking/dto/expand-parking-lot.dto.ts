import { IsInt, Min } from 'class-validator';

export class ExpandParkingLotDto {
  @IsInt()
  @Min(1)
  addCapacity: number;
}