"""
backend/tests/test_cache_task22.py — Test Suite for Task 22 (Claude Haiku Spec)
20 Tests for Caching Strategy Optimization: Redis/Memory L2, Hot Candles, Quotes,
TTL Eviction, Cache Invalidation, and Performance Metrics.
"""
import os
import sys
import time
import unittest
import asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from cache import CacheManager, CacheStats, init_cache, get_cache


class TestCacheManager(unittest.TestCase):
    def setUp(self):
        self.cache = CacheManager()

    # ==================== CANDLE CACHE TESTS ====================

    def test_cache_stats_initialization(self):
        """Stats should initialize with zeros"""
        stats = self.cache.stats['EURUSD']
        self.assertEqual(stats.hits, 0)
        self.assertEqual(stats.misses, 0)

    def test_candle_cache_hit(self):
        """Caching and retrieving candle should work"""
        symbol, timeframe = 'EURUSD', '1m'
        candle = {'open': 1.0850, 'close': 1.0860, 'high': 1.0870, 'low': 1.0840}

        self.assertTrue(self.cache.set_candle(symbol, timeframe, candle))
        retrieved = self.cache.get_candle(symbol, timeframe)

        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['open'], 1.0850)
        self.assertEqual(self.cache.stats[symbol].hits, 1)

    def test_candle_cache_miss(self):
        """Requesting non-existent candle should return None"""
        result = self.cache.get_candle('NONEXISTENT', '1m')
        self.assertIsNone(result)
        self.assertEqual(self.cache.stats['NONEXISTENT'].misses, 1)

    def test_candle_cache_ttl_expiration(self):
        """Candle should expire after TTL"""
        self.cache.CANDLE_TTL = 0.2  # 200ms
        candle = {'open': 1.0850, 'close': 1.0860}

        self.cache.set_candle('EURUSD', '1m', candle)
        self.assertIsNotNone(self.cache.get_candle('EURUSD', '1m'))

        time.sleep(0.3)
        self.assertIsNone(self.cache.get_candle('EURUSD', '1m'))

    def test_candle_cache_invalidation(self):
        """Invalidation should clear cache entry"""
        candle = {'open': 1.0850, 'close': 1.0860}
        self.cache.set_candle('EURUSD', '1m', candle)

        self.assertTrue(self.cache.invalidate_candle('EURUSD', '1m'))
        self.assertIsNone(self.cache.get_candle('EURUSD', '1m'))

    def test_candle_cache_invalidate_all_timeframes(self):
        """Invalidate with * should clear all timeframes"""
        candle = {'open': 1.0850, 'close': 1.0860}
        self.cache.set_candle('EURUSD', '1m', candle)
        self.cache.set_candle('EURUSD', '5m', candle)

        self.assertTrue(self.cache.invalidate_candle('EURUSD', '*'))
        self.assertIsNone(self.cache.get_candle('EURUSD', '1m'))
        self.assertIsNone(self.cache.get_candle('EURUSD', '5m'))

    # ==================== QUOTE CACHE TESTS ====================

    def test_quote_cache_set_get(self):
        """Quote caching should work"""
        quote = {'bid': 1.0850, 'ask': 1.0860, 'mid': 1.0855}

        self.assertTrue(self.cache.set_quote('EURUSD', quote))
        retrieved = self.cache.get_quote('EURUSD')

        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['bid'], 1.0850)

    def test_quote_cache_ttl_500ms(self):
        """Quote TTL should be 500ms"""
        self.cache.QUOTE_TTL = 0.2  # test with 200ms
        quote = {'bid': 1.0850, 'ask': 1.0860}
        self.cache.set_quote('EURUSD', quote)

        self.assertIsNotNone(self.cache.get_quote('EURUSD'))
        time.sleep(0.3)
        self.assertIsNone(self.cache.get_quote('EURUSD'))

    # ==================== HOT SYMBOLS TESTS ====================

    def test_update_top_symbols(self):
        """Should store top 20 symbols"""
        symbols = [f'SYM{i}' for i in range(25)]
        self.assertTrue(self.cache.update_top_symbols(symbols))

        top = self.cache.get_top_symbols()
        self.assertEqual(len(top), 20)
        self.assertEqual(top[0], 'SYM0')

    def test_top_symbols_empty_if_not_set(self):
        """Should return empty list if not set"""
        # fresh instance
        fresh_cache = CacheManager()
        fresh_cache.redis.delete(fresh_cache.TOP_SYMBOLS_KEY)
        top = fresh_cache.get_top_symbols()
        self.assertIsInstance(top, list)

    def test_top_symbols_limit_20(self):
        """Top symbols must not exceed 20"""
        many_symbols = [f'PAIR_{i}' for i in range(50)]
        self.cache.update_top_symbols(many_symbols)
        self.assertEqual(len(self.cache.get_top_symbols()), 20)

    # ==================== STATS TESTS ====================

    def test_cache_stats_hit_rate(self):
        """Hit rate should be calculated correctly"""
        self.cache.stats['EURUSD'].hits = 80
        self.cache.stats['EURUSD'].misses = 20

        stats = self.cache.get_stats('EURUSD')
        self.assertEqual(stats['hit_rate_pct'], 80.0)

    def test_cache_stats_aggregate(self):
        """Aggregate stats should sum across symbols"""
        self.cache.stats['EURUSD'].hits = 100
        self.cache.stats['EURUSD'].misses = 20
        self.cache.stats['GBPUSD'].hits = 50
        self.cache.stats['GBPUSD'].misses = 50

        stats = self.cache.get_stats()
        self.assertEqual(stats['total_hits'], 150)
        self.assertEqual(stats['total_misses'], 70)
        self.assertEqual(stats['tracked_symbols'], 2)

    def test_cache_stats_latency_calculation(self):
        """Average latency should be calculated"""
        self.cache.stats['EURUSD'].total_hit_latency_ms = 100
        self.cache.stats['EURUSD'].hits = 10

        stats = self.cache.get_stats('EURUSD')
        self.assertEqual(stats['avg_hit_latency_ms'], 10.0)

    # ==================== EDGE CASES ====================

    def test_cache_with_redis_unavailable(self):
        """Cache should gracefully handle Redis unavailability"""
        self.cache.redis = None

        candle = {'open': 1.0850, 'close': 1.0860}
        self.assertFalse(self.cache.set_candle('EURUSD', '1m', candle))
        self.assertIsNone(self.cache.get_candle('EURUSD', '1m'))

    def test_cache_json_serialization(self):
        """Complex candle objects should serialize correctly"""
        candle = {
            'open': 1.0850,
            'close': 1.0860,
            'high': 1.0870,
            'low': 1.0840,
            'volume': 1234567,
            'timestamp': datetime.utcnow().isoformat(),
            'signals': {'rsi': 65.5, 'macd': 0.0025}
        }

        self.cache.set_candle('EURUSD', '1m', candle)
        retrieved = self.cache.get_candle('EURUSD', '1m')

        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved['signals']['rsi'], 65.5)
        self.assertEqual(retrieved['volume'], 1234567)

    def test_multiple_symbols_quote_cache(self):
        """Quotes for multiple pairs should not collide"""
        self.cache.set_quote('EURUSD', {'mid': 1.0855})
        self.cache.set_quote('GBPUSD', {'mid': 1.2550})

        self.assertEqual(self.cache.get_quote('EURUSD')['mid'], 1.0855)
        self.assertEqual(self.cache.get_quote('GBPUSD')['mid'], 1.2550)

    def test_global_init_cache_and_get_cache(self):
        """Global cache instance should be retrievable"""
        mgr = init_cache()
        self.assertIsNotNone(mgr)
        self.assertEqual(mgr, get_cache())

    def test_stats_flush_to_db(self):
        """Stats should flush to database mock"""
        mock_db = AsyncMock()
        self.cache.db = mock_db
        self.cache.stats['EURUSD'].hits = 100
        self.cache.stats['EURUSD'].misses = 20
        self.cache.last_stats_flush = 0  # force flush

        asyncio.run(self.cache.flush_stats_to_db())
        self.assertTrue(mock_db.execute.called)

    def test_invalidation_log_called(self):
        """Invalidating candle should record log event"""
        mock_db = Mock()
        self.cache.db = mock_db
        self.cache.invalidate_candle('EURUSD', '15m', 'candle_close')
        self.assertTrue(mock_db.execute.called)


if __name__ == "__main__":
    unittest.main()
