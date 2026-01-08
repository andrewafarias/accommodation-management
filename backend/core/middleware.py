"""
Middleware for core app.
"""


class RobotsMiddleware:
    """
    Middleware to add X-Robots-Tag header to prevent search engine indexing.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        response['X-Robots-Tag'] = 'noindex, nofollow'
        return response
