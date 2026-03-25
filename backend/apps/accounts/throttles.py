"""Auth endpoint throttles."""

from rest_framework.throttling import SimpleRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    """Throttle anonymous/public endpoints by client IP."""

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class LoginRateThrottle(IPRateThrottle):
    scope = "auth_login"


class SetupBootstrapRateThrottle(IPRateThrottle):
    scope = "auth_setup_bootstrap"
