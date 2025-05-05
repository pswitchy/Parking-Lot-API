import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
  } from '@nestjs/common';
  import { MinPriorityQueue } from '@datastructures-js/priority-queue';
  import { CarInfo } from './interfaces/car-info.interface';
  
  @Injectable()
  export class ParkingService {
    private readonly logger = new Logger(ParkingService.name);
  
    private totalSlots = 0;
    private occupiedSlots = new Map<number, CarInfo>(); // slotNumber -> CarInfo
    private registrationToSlotMap = new Map<string, number>(); // registrationNumber -> slotNumber
    private availableSlots = new MinPriorityQueue<number>();
    private isInitialized = false;
  
    // --- Initialization and Expansion ---
  
    createParkingLot(capacity: number): { message: string; capacity: number } {
      if (this.isInitialized) {
        // Option 1: Throw error if already initialized
        // throw new ConflictException('Parking lot already initialized.');
  
        // Option 2: Re-initialize (resetting everything) - Let's choose this for simplicity
        this.logger.warn(`Re-initializing parking lot with capacity ${capacity}. Existing state will be lost.`);
        this.resetLot(); // Clear previous state
      }
  
      if (capacity <= 0) {
          throw new BadRequestException('Capacity must be a positive integer.');
      }
  
      this.totalSlots = capacity;
      this.availableSlots = new MinPriorityQueue<number>(); // Reset queue
      for (let i = 1; i <= capacity; i++) {
        this.availableSlots.enqueue(i);
      }
      this.isInitialized = true;
      this.logger.log(`Parking lot created with ${capacity} slots.`);
      return { message: 'Parking lot created successfully.', capacity: this.totalSlots };
    }
  
    expandParkingLot(addCapacity: number): { message: string; oldCapacity: number; newCapacity: number } {
      this.checkInitialized();
       if (addCapacity <= 0) {
          throw new BadRequestException('Additional capacity must be a positive integer.');
      }
  
      const oldCapacity = this.totalSlots;
      const startSlot = this.totalSlots + 1;
      const endSlot = this.totalSlots + addCapacity;
  
      for (let i = startSlot; i <= endSlot; i++) {
        this.availableSlots.enqueue(i);
      }
      this.totalSlots += addCapacity;
  
      this.logger.log(`Parking lot expanded by ${addCapacity} slots. New total: ${this.totalSlots}.`);
      return {
          message: `Added ${addCapacity} slots successfully.`,
          oldCapacity: oldCapacity,
          newCapacity: this.totalSlots
      };
    }
  
    // --- Core Parking Operations ---
  
    parkCar(registrationNumber: string, color: string): { slotNumber: number; registrationNumber: string; color: string } {
      this.checkInitialized();
  
      if (this.availableSlots.isEmpty()) {
        throw new ConflictException('Sorry, parking lot is full.');
      }
  
      if (this.registrationToSlotMap.has(registrationNumber)) {
        throw new ConflictException(`Car with registration number ${registrationNumber} is already parked.`);
      }
  
      try {
        const nearestSlot = this.availableSlots.dequeue(); // O(log k)
        if (nearestSlot === undefined || nearestSlot === null) {
           // Should not happen if isEmpty check passed, but defensive coding
           this.logger.error('Failed to dequeue slot even though availableSlots was not empty.');
           throw new InternalServerErrorException('Error allocating slot. Please try again.');
        }
        const slotNumber = nearestSlot;
        const carInfo: CarInfo = { registrationNumber, color };
  
        this.occupiedSlots.set(slotNumber, carInfo); // O(1) average
        this.registrationToSlotMap.set(registrationNumber, slotNumber); // O(1) average
  
        this.logger.log(`Car ${registrationNumber} (${color}) parked in slot ${slotNumber}.`);
        return { slotNumber, registrationNumber, color };
      } catch (error) {
          this.logger.error(`Error during parking car ${registrationNumber}: ${error.message}`, error.stack);
          // If dequeue failed unexpectedly, re-enqueue might be complex. Better to log and throw.
          throw new InternalServerErrorException('An unexpected error occurred during parking.');
      }
    }
  
    unparkCarBySlot(slotNumber: number): { message: string; freedSlotNumber: number } {
      this.checkInitialized();
  
      if (slotNumber <= 0 || slotNumber > this.totalSlots) {
          throw new BadRequestException(`Invalid slot number ${slotNumber}. Must be between 1 and ${this.totalSlots}.`);
      }
  
      const carInfo = this.occupiedSlots.get(slotNumber); // O(1) average
  
      if (!carInfo) {
        throw new NotFoundException(`Slot number ${slotNumber} is already free.`);
      }
  
      this.occupiedSlots.delete(slotNumber); // O(1) average
      this.registrationToSlotMap.delete(carInfo.registrationNumber); // O(1) average
      this.availableSlots.enqueue(slotNumber); // O(log k)
  
      this.logger.log(`Slot ${slotNumber} freed. Car ${carInfo.registrationNumber} left.`);
      return { message: `Slot number ${slotNumber} is free.`, freedSlotNumber: slotNumber };
    }
  
    unparkCarByRegistration(registrationNumber: string): { message: string; freedSlotNumber: number } {
      this.checkInitialized();
  
      const slotNumber = this.registrationToSlotMap.get(registrationNumber); // O(1) average
  
      if (slotNumber === undefined) {
        throw new NotFoundException(`Car with registration number ${registrationNumber} not found.`);
      }
  
      // Now we know the slot number, delegate to the other unpark method
      // This avoids duplicating the logic for removing from maps and adding to queue
      return this.unparkCarBySlot(slotNumber);
    }
  
    // --- Query Operations ---
  
    getStatus(): Array<{ slotNumber: number; registrationNumber: string; color: string }> {
      this.checkInitialized();
  
      const status = Array.from(this.occupiedSlots.entries())
        .map(([slotNumber, carInfo]) => ({
          slotNumber,
          registrationNumber: carInfo.registrationNumber,
          color: carInfo.color,
        }))
        .sort((a, b) => a.slotNumber - b.slotNumber); // Sort by slot number for consistent output
  
      return status;
    }
  
    getRegistrationNumbersByColor(color: string): string[] {
      this.checkInitialized();
      const registrationNumbers: string[] = [];
      // O(N) where N is the number of *occupied* slots
      for (const carInfo of this.occupiedSlots.values()) {
        if (carInfo.color === color) {
          registrationNumbers.push(carInfo.registrationNumber);
        }
      }
      return registrationNumbers;
    }
  
    getSlotNumbersByColor(color: string): number[] {
      this.checkInitialized();
      const slotNumbers: number[] = [];
       // O(N) where N is the number of *occupied* slots
      for (const [slotNumber, carInfo] of this.occupiedSlots.entries()) {
        if (carInfo.color === color) {
          slotNumbers.push(slotNumber);
        }
      }
      slotNumbers.sort((a, b) => a - b); // Optional: sort for consistency
      return slotNumbers;
    }
  
    getSlotByRegistrationNumber(registrationNumber: string): { slotNumber: number } {
      this.checkInitialized();
      const slotNumber = this.registrationToSlotMap.get(registrationNumber); // O(1) average
  
      if (slotNumber === undefined) {
        throw new NotFoundException(`Car with registration number ${registrationNumber} not found.`);
      }
      return { slotNumber };
    }
  
    // --- Helper Methods ---
  
    private checkInitialized(): void {
      if (!this.isInitialized) {
        throw new BadRequestException('Parking lot has not been initialized. Please create it first.');
      }
    }
  
    private resetLot(): void {
       this.totalSlots = 0;
       this.occupiedSlots.clear();
       this.registrationToSlotMap.clear();
       // Assuming MinPriorityQueue doesn't have a clear, create a new one
       this.availableSlots = new MinPriorityQueue<number>();
       this.isInitialized = false;
       this.logger.log('Parking lot state has been reset.');
    }
  
    // --- Optional: For testing or potential future use ---
    getCurrentState() {
        return {
            totalSlots: this.totalSlots,
            isInitialized: this.isInitialized,
            occupiedCount: this.occupiedSlots.size,
            availableCount: this.availableSlots.size(),
            // Be cautious exposing internal structures directly
            // availableSlotsSnapshot: this.availableSlots.toArray(), // Might be useful for debugging/testing
        };
    }
  }