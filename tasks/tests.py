# tasks/tests.py
from django.test import TestCase
from .scoring import compute_scores, detect_cycle
from datetime import date, timedelta

class ScoringAlgorithmTests(TestCase):
    def setUp(self):
        # helper: dates for tests
        self.today = date.today()
        self.tomorrow = (self.today + timedelta(days=1)).isoformat()
        self.later = (self.today + timedelta(days=10)).isoformat()
        self.past = (self.today - timedelta(days=2)).isoformat()

    def test_overdue_task_has_higher_urgency(self):
        """
        Overdue tasks should receive a strong urgency boost and therefore
        rank above a similar non-overdue task when other attributes are similar.
        """
        tasks = [
            {"id":"a","title":"Past","due_date": self.past, "estimated_hours":2, "importance":5, "dependencies":[]},
            {"id":"b","title":"Future","due_date": self.later, "estimated_hours":2, "importance":5, "dependencies":[]}
        ]
        res = compute_scores(tasks, strategy='smart_balance')
        # first result should be the overdue task 'a'
        self.assertEqual(res[0]['id'], 'a', f"Expected overdue task 'a' first but got {res[0]['id']}")

    def test_fastest_wins_prioritizes_low_effort(self):
        """
        In 'fastest_wins' strategy, a low-estimated_hours task should be ranked above a high-effort task,
        even if importance is slightly lower.
        """
        tasks = [
            {"id":"x","title":"Long","due_date": self.later, "estimated_hours":10, "importance":8, "dependencies":[]},
            {"id":"y","title":"Quick","due_date": self.later, "estimated_hours":1, "importance":6, "dependencies":[]}
        ]
        res = compute_scores(tasks, strategy='fastest_wins')
        # quick should come before long
        ordered_ids = [t['id'] for t in res]
        self.assertTrue(ordered_ids.index('y') < ordered_ids.index('x'),
                        f"Expected 'y' before 'x' in fastest_wins, got order {ordered_ids}")

    def test_dependency_increases_priority(self):
        """
        If task A is blocking multiple tasks (others depend on A),
        its dependency score should push it up the ranking.
        """
        tasks = [
            {"id":"1","title":"Base","due_date": self.later, "estimated_hours":3, "importance":5, "dependencies":[]},
            {"id":"2","title":"Dep1","due_date": self.later, "estimated_hours":1, "importance":4, "dependencies":["1"]},
            {"id":"3","title":"Dep2","due_date": self.later, "estimated_hours":1, "importance":4, "dependencies":["1"]}
        ]
        res = compute_scores(tasks, strategy='smart_balance')
        # task "1" is blocking two tasks, so it should rank higher than at least one dependent
        ids = [r['id'] for r in res]
        self.assertTrue(ids.index('1') < ids.index('2') or ids.index('1') < ids.index('3'),
                        f"Expected '1' to be higher than at least one dependent; order {ids}")

    def test_detect_cycle_true(self):
        """Simple 2-node cycle detection should return True."""
        tasks = [
            {"id":"a","title":"A","dependencies":["b"]},
            {"id":"b","title":"B","dependencies":["a"]}
        ]
        self.assertTrue(detect_cycle(tasks), "Expected cycle detected for a<->b")

    def test_detect_cycle_false(self):
        """Non-cyclic dependency graph must return False."""
        tasks = [
            {"id":"1","title":"Root","dependencies":[]},
            {"id":"2","title":"Leaf","dependencies":["1"]}
        ]
        self.assertFalse(detect_cycle(tasks), "Expected no cycle in simple chain")
