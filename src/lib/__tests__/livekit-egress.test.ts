import { startRoomEgress, stopEgress, setEgressClient } from '../livekit-egress';
import { db } from '../db';
import { EgressClient } from 'livekit-server-sdk';

// Mock the livekit-server-sdk
jest.mock('livekit-server-sdk', () => {
  return {
    EgressClient: jest.fn().mockImplementation(() => {
      return {
        startRoomCompositeEgress: jest.fn(),
        stopEgress: jest.fn(),
      };
    }),
    RoomServiceClient: jest.fn().mockImplementation(() => {
      return {};
    }),
  };
});

// Mock the db
jest.mock('../db', () => {
  return {
    db: {
      liveKitRoom: {
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      recording: {
        create: jest.fn().mockResolvedValue({}),
      },
      meeting: {
        update: jest.fn().mockResolvedValue({}),
      },
    },
  };
});

const mockEgressClient = new EgressClient('http://test.com', 'key', 'secret') as jest.Mocked<EgressClient>;

describe('livekit-egress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEgressClient(mockEgressClient);
  });

  describe('startRoomEgress', () => {
    it('should return null when egressClient is not configured', async () => {
      setEgressClient(null);
      const result = await startRoomEgress('test-room', 'test-meeting');
      expect(result).toBeNull();
    });

    it('should return the egressId when successful', async () => {
      const mockEgressId = 'test-egress-id';
      mockEgressClient.startRoomCompositeEgress.mockResolvedValue({ egressId: mockEgressId } as any);

      const result = await startRoomEgress('test-room', 'test-meeting');
      expect(result).toBe(mockEgressId);
      expect(mockEgressClient.startRoomCompositeEgress).toHaveBeenCalledWith(
        'test-room',
        expect.any(Object),
        {
          layout: 'grid',
          audioOnly: false,
        }
      );
    });

    it('should return null when egress client times out', async () => {
      mockEgressClient.startRoomCompositeEgress.mockRejectedValue(new Error('Operation timed out after 10000ms'));

      const result = await startRoomEgress('test-room', 'test-meeting');
      expect(result).toBeNull();
      expect(mockEgressClient.startRoomCompositeEgress).toHaveBeenCalled();
    });

    it('should return null when egress client throws an error', async () => {
      mockEgressClient.startRoomCompositeEgress.mockRejectedValue(new Error('Internal error'));

      const result = await startRoomEgress('test-room', 'test-meeting');
      expect(result).toBeNull();
    });
  });

  describe('stopEgress', () => {
    it('should return false when egressClient is not configured', async () => {
      setEgressClient(null);
      const result = await stopEgress('test-egress-id');
      expect(result).toBe(false);
    });

    it('should return true when successful', async () => {
      mockEgressClient.stopEgress.mockResolvedValue(undefined as any);
      const result = await stopEgress('test-egress-id');
      expect(result).toBe(true);
    });

    it('should return false when stopEgress throws an error', async () => {
      mockEgressClient.stopEgress.mockRejectedValue(new Error('Failed to stop'));
      const result = await stopEgress('test-egress-id');
      expect(result).toBe(false);
    });
  });
});