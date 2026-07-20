// QUANTUM LABS — Router
// Clean URLs via pushState. Works with GitHub Pages 404.html redirect.

export const Router = (() => {
  "use strict";

  // Routing state
  const routes = {};
  let currentRoute = null;
  let pageContainer = null;

  // Maps a specific URL path to its corresponding page render function.
  function register(path, renderFn) {
    routes[path] = renderFn;
  }

  // Initializes the router, intercepts anchor clicks, and binds browser history navigation.
  function init(containerId) {
    pageContainer = document.getElementById(containerId);

    // Handle browser back/forward
    window.addEventListener("popstate", handleRoute);

    // Intercept all internal link clicks
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[href]");
      if (!link) {
        return;
      }

      const href = link.getAttribute("href");

      // Skip external links, anchors, and special protocols
      if (!href ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("#") ||
      link.target === "_blank") {
        return;
      }

      // Internal route
      if (routes[href] || href === "/") {
        e.preventDefault();
        navigate(href);
      }
    });

    // Initial route
    handleRoute();
  }

  // Evaluates the current URL path, determines the correct route, and triggers a page transition.
  function handleRoute() {
    return new Promise((resolve) => {
      const path = window.location.pathname || "/";

      // Find matching route
      const renderFn = routes[path] || routes["/"];
      if (!renderFn) {
        resolve();
        return;
      }

      if (currentRoute === path) {
        resolve();
        return;
      }
      currentRoute = path;

      // Update nav active state
      document.querySelectorAll(".nav-link").forEach((link) => {
        const href = link.getAttribute("href");
        link.classList.toggle(
          "active",
          href === path || (href === "/" && path === "/"),
        );
      });

      // Transition out
      if (pageContainer) {
        pageContainer.classList.add("page-exit");
        setTimeout(() => {
          pageContainer.innerHTML = "";
          renderFn(pageContainer);
          pageContainer.classList.remove("page-exit");
          pageContainer.classList.add("page-enter");
          setTimeout(() => pageContainer.classList.remove("page-enter"), 300);
          window.scrollTo(0, 0);
          resolve();
        }, 150);
      } else {
        resolve();
      }
    });
  }

  // Programmatically navigates to a new path via the History API without reloading the page.
  function navigate(path) {
    if (path === currentRoute) {
      return Promise.resolve();
    }
    window.history.pushState({}, "", path);
    return handleRoute();
  }

  // Returns the currently active route path string.
  function getCurrentRoute() {
    return currentRoute;
  }

  return { register, init, navigate, getCurrentRoute };
})();
