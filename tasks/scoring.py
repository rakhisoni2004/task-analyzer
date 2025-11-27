# tasks/scoring.py
from datetime import datetime, date
from typing import List, Dict, Tuple

DATE_FMT = "%Y-%m-%d"

def parse_date(s: str):
    if not s:
        return None
    try:
        return datetime.strptime(s, DATE_FMT).date()
    except Exception:
        return None

def days_left(due_date_str: str):
    d = parse_date(due_date_str)
    if d is None:
        return None
    return (d - date.today()).days

def human_urgency_text(days_diff: int) -> str:
    """
    Convert integer days_diff into a human friendly string:
      days_diff < 0 -> "Past due by X day(s)"
      days_diff == 0 -> "Due today"
      days_diff > 0 -> "X day(s) left"
    Handles singular/plural correctly.
    """
    if days_diff is None:
        return "No due date"
    if days_diff < 0:
        d = abs(days_diff)
        return f"Past due by {d} day" + ("s" if d != 1 else "")
    if days_diff == 0:
        return "Due today"
    # positive
    return f"{days_diff} day" + ("s" if days_diff != 1 else "") + " left"

def detect_cycle(tasks: List[Dict]) -> bool:
    """
    Detect directed cycle in tasks graph where each task has 'id' and 'dependencies' list.
    Returns True if a cycle exists.
    """
    graph = {t['id']: t.get('dependencies', []) for t in tasks}
    visiting = set()
    visited = set()

    def dfs(node):
        if node in visiting:
            return True
        if node in visited:
            return False
        visiting.add(node)
        for nbr in graph.get(node, []):
            # ignore dependencies not present in graph (external refs)
            if nbr not in graph:
                continue
            if dfs(nbr):
                return True
        visiting.remove(node)
        visited.add(node)
        return False

    for n in graph:
        if dfs(n):
            return True
    return False

def compute_scores(tasks: List[Dict], strategy: str = 'smart_balance') -> List[Dict]:
    """
    Compute a score and explanation for each task. Returns list sorted descending by score.
    Each returned dict is original task plus 'score' and 'explanation'.
    """
    # safe defaults
    for t in tasks:
        t.setdefault('importance', 5)
        t.setdefault('estimated_hours', 2)
        t.setdefault('dependencies', [])
    # how many tasks depend on each task (blocks count)
    blocked_count = {t['id']: 0 for t in tasks}
    for t in tasks:
        for dep in t.get('dependencies', []):
            if dep in blocked_count:
                blocked_count[dep] += 1

    # strategy weight tuples (urgency, importance, effort, dependency)
    strategies = {
        'smart_balance':    (0.30, 0.38, 0.17, 0.15),
        'fastest_wins':     (0.10, 0.20, 0.60, 0.10),
        'high_impact':      (0.12, 0.70, 0.06, 0.12),
        'deadline_driven':  (0.70, 0.15, 0.05, 0.10)
    }
    w1, w2, w3, w4 = strategies.get(strategy, strategies['smart_balance'])

    results = []
    for t in tasks:
        dl = days_left(t.get('due_date'))
        # urgency calculation
        if dl is None:
            urgency = 5
            urgency_text = human_urgency_text(None)
        elif dl < 0:
            # overdue boost (large)
            # keep numeric boost same as before but use human_urgency_text for display
            urgency = 120 + min(30, -dl)
            urgency_text = human_urgency_text(dl)
        else:
            if dl <= 3:
                urgency = 40 + (3 - dl) * 15
            else:
                urgency = max(0, 30 - dl / 1.5)
            urgency_text = human_urgency_text(dl)

        # importance scaled 0-90
        importance_score = max(0, min(10, t['importance'])) * 9
        # effort (quick wins) scaled ~0-30 (smaller hours -> larger)
        effort_score = (1 / (1 + max(0.1, float(t['estimated_hours'])))) * 30
        # dependency: each blocked increases
        dependency_score = blocked_count.get(t['id'], 0) * 22

        raw_score = w1 * urgency + w2 * importance_score + w3 * effort_score + w4 * dependency_score
        score = round(float(raw_score), 2)

        explanation = {
            "urgency_text": urgency_text,
            "importance": t['importance'],
            "effort_hours": t['estimated_hours'],
            "blocks_count": blocked_count.get(t['id'], 0)
        }

        results.append({**t, "score": score, "explanation": explanation})

    results.sort(key=lambda x: x['score'], reverse=True)
    return results
