import { describe, it, expect } from 'vitest';
import { formatBytes, formatUptime, formatNumber, formatPercent, getStatusColor } from '../utils/format';

describe('Format Utilities', () => {
  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    });
  });

  describe('formatUptime', () => {
    it('should format seconds correctly', () => {
      expect(formatUptime(30)).toBe('30s');
      expect(formatUptime(60)).toBe('1m');
      expect(formatUptime(90)).toBe('1m 30s');
    });

    it('should format minutes correctly', () => {
      expect(formatUptime(3600)).toBe('1h');
      expect(formatUptime(3660)).toBe('1h 1m');
    });

    it('should format hours correctly', () => {
      expect(formatUptime(86400)).toBe('1d');
      expect(formatUptime(90000)).toBe('1d 1h');
    });

    it('should format days correctly', () => {
      expect(formatUptime(172800)).toBe('2d');
      expect(formatUptime(176400)).toBe('2d 1h');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123)).toBe('123');
    });
  });

  describe('formatPercent', () => {
    it('should format percentages correctly', () => {
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(50)).toBe('50%');
      expect(formatPercent(100)).toBe('100%');
      expect(formatPercent(33.333)).toBe('33.3%');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for status', () => {
      expect(getStatusColor('running')).toBe('text-green-500');
      expect(getStatusColor('active')).toBe('text-green-500');
      expect(getStatusColor('stopped')).toBe('text-red-500');
      expect(getStatusColor('failed')).toBe('text-red-500');
      expect(getStatusColor('exited')).toBe('text-slate-500');
      expect(getStatusColor('unknown')).toBe('text-slate-500');
    });
  });
});
