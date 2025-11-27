# tasks/views.py
import json
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from .scoring import compute_scores, detect_cycle

@csrf_exempt
def analyze_tasks(request):
    """
    POST /api/tasks/analyze/
    Accepts either:
      - JSON array of tasks (body = [ {task}, ... ])
      - JSON object { "tasks": [...], "strategy": "smart_balance" }
    Responds with {"results": [ ... ], "warning": ...?}
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("POST required")

    try:
        payload = json.loads(request.body.decode('utf-8') or "null")
    except Exception as e:
        return HttpResponseBadRequest(f"Invalid JSON: {str(e)}")

    if isinstance(payload, dict) and 'tasks' in payload:
        tasks = payload['tasks']
        strategy = payload.get('strategy', 'smart_balance')
    elif isinstance(payload, list):
        tasks = payload
        strategy = 'smart_balance'
    else:
        return HttpResponseBadRequest("Send a JSON array, or an object with 'tasks' key")

    if not isinstance(tasks, list):
        return HttpResponseBadRequest("'tasks' must be a list")

    # minimal validation
    for i, t in enumerate(tasks):
        if 'id' not in t or 'title' not in t:
            return HttpResponseBadRequest(f"Task at index {i} missing 'id' or 'title'")

    circular = detect_cycle(tasks)
    results = compute_scores(tasks, strategy=strategy)
    resp = {"results": results}
    if circular:
        resp["warning"] = "circular_dependencies_detected"
    return JsonResponse(resp, safe=False)

@csrf_exempt
def suggest_tasks(request):
    """
    POST /api/tasks/suggest/
    Accepts same payload as analyze; returns top 3 suggestions under 'suggestions'
    """
    if request.method != 'POST':
        return HttpResponseBadRequest("POST required")

    try:
        payload = json.loads(request.body.decode('utf-8') or "null")
    except Exception as e:
        return HttpResponseBadRequest(f"Invalid JSON: {str(e)}")

    if isinstance(payload, dict) and 'tasks' in payload:
        tasks = payload['tasks']
        strategy = payload.get('strategy', 'smart_balance')
    elif isinstance(payload, list):
        tasks = payload
        strategy = 'smart_balance'
    else:
        return HttpResponseBadRequest("Send a JSON array, or an object with 'tasks' key")

    if not isinstance(tasks, list):
        return HttpResponseBadRequest("'tasks' must be a list")

    results = compute_scores(tasks, strategy=strategy)
    top3 = results[:3]
    return JsonResponse({"suggestions": top3}, safe=False)
