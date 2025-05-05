import { Test, TestingModule } from '@nestjs/testing';
import { ParkingService } from './parking.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ParkingService', () => {
  let service: ParkingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParkingService],
    }).compile();

    service = module.get<ParkingService>(ParkingService);
    // Reset state before each test (or initialize a default small lot)
    // service.createParkingLot(3); // Example: Start with a lot of size 3 for some tests
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createParkingLot', () => {
    it('should initialize the parking lot', () => {
      const result = service.createParkingLot(5);
      expect(result).toEqual({ message: 'Parking lot created successfully.', capacity: 5 });
      const state = service.getCurrentState();
      expect(state.totalSlots).toBe(5);
      expect(state.isInitialized).toBe(true);
      expect(state.availableCount).toBe(5);
    });

    it('should throw error for zero capacity', () => {
        expect(() => service.createParkingLot(0)).toThrow(BadRequestException);
    });

     it('should throw error for negative capacity', () => {
        expect(() => service.createParkingLot(-1)).toThrow(BadRequestException);
    });

    it('should re-initialize if called again', () => {
      service.createParkingLot(5);
      const result = service.createParkingLot(3); // Re-initialize
      expect(result).toEqual({ message: 'Parking lot created successfully.', capacity: 3 });
      const state = service.getCurrentState();
      expect(state.totalSlots).toBe(3);
      expect(state.availableCount).toBe(3);
    });
  });

  describe('expandParkingLot', () => {
    it('should throw error if not initialized', () => {
        expect(() => service.expandParkingLot(2)).toThrow(BadRequestException);
        expect(() => service.expandParkingLot(2)).toThrow('Parking lot has not been initialized');
    });

     it('should throw error for non-positive additional capacity', () => {
        service.createParkingLot(5);
        expect(() => service.expandParkingLot(0)).toThrow(BadRequestException);
        expect(() => service.expandParkingLot(-1)).toThrow(BadRequestException);
    });

    it('should expand the parking lot correctly', () => {
        service.createParkingLot(3);
        const result = service.expandParkingLot(2);
        expect(result).toEqual({ message: 'Added 2 slots successfully.', oldCapacity: 3, newCapacity: 5 });
        const state = service.getCurrentState();
        expect(state.totalSlots).toBe(5);
        expect(state.availableCount).toBe(5); // 3 initial + 2 new
    });

     it('should expand correctly after some parking', () => {
        service.createParkingLot(2);
        service.parkCar('CAR-A', 'Red'); // Parks in 1
        const result = service.expandParkingLot(2); // Add 3, 4
        expect(result.newCapacity).toBe(4);
        const state = service.getCurrentState();
        expect(state.totalSlots).toBe(4);
        expect(state.availableCount).toBe(3); // Slot 2, 3, 4 should be available
        expect(state.occupiedCount).toBe(1);
    });
  });


  describe('parkCar', () => {
    beforeEach(() => {
      service.createParkingLot(2); // Initialize with 2 slots for parking tests
    });

    it('should throw error if not initialized', () => {
        const uninitializedService = new ParkingService(); // Create a fresh instance
        expect(() => uninitializedService.parkCar('CAR-A', 'Red')).toThrow(BadRequestException);
        expect(() => uninitializedService.parkCar('CAR-A', 'Red')).toThrow('Parking lot has not been initialized');
    });

    it('should park a car in the nearest slot (1)', () => {
      const result = service.parkCar('KA-01-HH-1234', 'White');
      expect(result).toEqual({
        slotNumber: 1,
        registrationNumber: 'KA-01-HH-1234',
        color: 'White',
      });
      const state = service.getCurrentState();
      expect(state.occupiedCount).toBe(1);
      expect(state.availableCount).toBe(1);
    });

    it('should park a second car in the next nearest slot (2)', () => {
      service.parkCar('KA-01-HH-1234', 'White'); // Parks in 1
      const result = service.parkCar('KA-01-HH-9999', 'Black'); // Should park in 2
      expect(result.slotNumber).toBe(2);
       const state = service.getCurrentState();
       expect(state.occupiedCount).toBe(2);
       expect(state.availableCount).toBe(0);
    });

    it('should throw ConflictException if parking lot is full', () => {
      service.parkCar('CAR-A', 'ColorA'); // Slot 1
      service.parkCar('CAR-B', 'ColorB'); // Slot 2
      expect(() => service.parkCar('CAR-C', 'ColorC')).toThrow(ConflictException);
      expect(() => service.parkCar('CAR-C', 'ColorC')).toThrow('Sorry, parking lot is full.');
    });

    it('should throw ConflictException if car is already parked', () => {
      service.parkCar('DUPLICATE-CAR', 'Red');
      expect(() => service.parkCar('DUPLICATE-CAR', 'Blue')).toThrow(ConflictException);
      expect(() => service.parkCar('DUPLICATE-CAR', 'Blue')).toThrow(
        'Car with registration number DUPLICATE-CAR is already parked.',
      );
    });
  });

  describe('unparkCarBySlot', () => {
     beforeEach(() => {
       service.createParkingLot(3);
       service.parkCar('CAR-A', 'Red');   // Slot 1
       service.parkCar('CAR-B', 'Blue');  // Slot 2
     });

     it('should throw error if not initialized', () => {
        const uninitializedService = new ParkingService();
        expect(() => uninitializedService.unparkCarBySlot(1)).toThrow(BadRequestException);
    });

    it('should free the specified slot', () => {
      const result = service.unparkCarBySlot(1);
      expect(result).toEqual({ message: 'Slot number 1 is free.', freedSlotNumber: 1 });
      const state = service.getCurrentState();
      expect(state.occupiedCount).toBe(1);
      expect(state.availableCount).toBe(2); // Slot 1 and 3 available
      expect(service.getStatus().find(s => s.slotNumber === 1)).toBeUndefined();
    });

     it('should make the freed slot available for parking (nearest first)', () => {
        service.unparkCarBySlot(1); // Slot 1 becomes free
        const result = service.parkCar('CAR-C', 'Green'); // Should park in slot 1 again
        expect(result.slotNumber).toBe(1);
    });

    it('should throw NotFoundException if slot is already free', () => {
      expect(() => service.unparkCarBySlot(3)).toThrow(NotFoundException); // Slot 3 was never occupied
      expect(() => service.unparkCarBySlot(3)).toThrow('Slot number 3 is already free.');
    });

     it('should throw BadRequestException for invalid slot number (zero)', () => {
        expect(() => service.unparkCarBySlot(0)).toThrow(BadRequestException);
     });

      it('should throw BadRequestException for invalid slot number (out of range)', () => {
        expect(() => service.unparkCarBySlot(4)).toThrow(BadRequestException); // Only 3 slots exist
     });
  });

  describe('unparkCarByRegistration', () => {
      beforeEach(() => {
       service.createParkingLot(3);
       service.parkCar('CAR-A', 'Red');   // Slot 1
       service.parkCar('CAR-B', 'Blue');  // Slot 2
     });

      it('should throw error if not initialized', () => {
        const uninitializedService = new ParkingService();
        expect(() => uninitializedService.unparkCarByRegistration('CAR-A')).toThrow(BadRequestException);
    });

     it('should free the correct slot based on registration number', () => {
      const result = service.unparkCarByRegistration('CAR-B');
      expect(result).toEqual({ message: 'Slot number 2 is free.', freedSlotNumber: 2 });
       const state = service.getCurrentState();
       expect(state.occupiedCount).toBe(1);
       expect(state.availableCount).toBe(2); // Slot 2 and 3 available
       expect(service.getStatus().find(s => s.registrationNumber === 'CAR-B')).toBeUndefined();
       expect(service.getStatus().find(s => s.slotNumber === 2)).toBeUndefined();
    });

    it('should throw NotFoundException if car registration not found', () => {
      expect(() => service.unparkCarByRegistration('NON-EXISTENT')).toThrow(NotFoundException);
      expect(() => service.unparkCarByRegistration('NON-EXISTENT')).toThrow(
        'Car with registration number NON-EXISTENT not found.',
      );
    });
  });

  describe('Queries', () => {
      beforeEach(() => {
        service.createParkingLot(5);
        service.parkCar('REG-A', 'White'); // Slot 1
        service.parkCar('REG-B', 'Red');   // Slot 2
        service.parkCar('REG-C', 'White'); // Slot 3
        service.parkCar('REG-D', 'Blue');  // Slot 4
      });

      it('should throw error if not initialized for getStatus', () => {
         const uninitializedService = new ParkingService();
         expect(() => uninitializedService.getStatus()).toThrow(BadRequestException);
      });

      it('getStatus should return all occupied slots sorted by slot number', () => {
        const status = service.getStatus();
        expect(status).toHaveLength(4);
        expect(status).toEqual([
          { slotNumber: 1, registrationNumber: 'REG-A', color: 'White' },
          { slotNumber: 2, registrationNumber: 'REG-B', color: 'Red' },
          { slotNumber: 3, registrationNumber: 'REG-C', color: 'White' },
          { slotNumber: 4, registrationNumber: 'REG-D', color: 'Blue' },
        ]);
      });

      it('getRegistrationNumbersByColor should return correct registrations', () => {
        expect(service.getRegistrationNumbersByColor('White')).toEqual(['REG-A', 'REG-C']);
        expect(service.getRegistrationNumbersByColor('Red')).toEqual(['REG-B']);
        expect(service.getRegistrationNumbersByColor('Blue')).toEqual(['REG-D']);
        expect(service.getRegistrationNumbersByColor('Green')).toEqual([]);
      });

       it('getSlotNumbersByColor should return correct slots sorted', () => {
        expect(service.getSlotNumbersByColor('White')).toEqual([1, 3]);
        expect(service.getSlotNumbersByColor('Red')).toEqual([2]);
        expect(service.getSlotNumbersByColor('Blue')).toEqual([4]);
        expect(service.getSlotNumbersByColor('Green')).toEqual([]);
      });

      it('getSlotByRegistrationNumber should return correct slot', () => {
        expect(service.getSlotByRegistrationNumber('REG-A')).toEqual({ slotNumber: 1 });
        expect(service.getSlotByRegistrationNumber('REG-C')).toEqual({ slotNumber: 3 });
      });

      it('getSlotByRegistrationNumber should throw NotFoundException if car not found', () => {
        expect(() => service.getSlotByRegistrationNumber('NON-EXISTENT')).toThrow(NotFoundException);
      });
  });

});