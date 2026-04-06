(function() {
    // Locate our script tag
    var script = document.currentScript;
    if (!script) {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
                script = scripts[i]; 
                break;
            }
        }
    }
    
    if (!script) {
        console.error("Dispatch SaaS Widget: Cannot find script tag.");
        return;
    }

    var apiKey = script.getAttribute('data-api-key') || '';
    var color = script.getAttribute('data-color') || '#1d4ed8'; // default blue
    
    // Extract base URL from script src
    var srcUrl = new URL(script.src);
    var host = srcUrl.origin;
    
    // Create the iframe
    var iframe = document.createElement('iframe');
    iframe.src = host + '/widget?key=' + encodeURIComponent(apiKey) + '&color=' + encodeURIComponent(color);
    
    // Default closed styles
    iframe.style.position = 'fixed';
    iframe.style.bottom = '20px';
    iframe.style.right = '20px';
    iframe.style.width = '80px';
    iframe.style.height = '80px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '2147483647'; // max z-index
    iframe.style.borderRadius = '50%';
    iframe.style.overflow = 'hidden';
    iframe.style.background = 'transparent';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.title = "Booking Assistant AI Chat";
    
    // Dynamic resizing via postMessage
    window.addEventListener('message', function(e) {
        if (e.origin !== host) return;
        if (e.data && e.data.type === 'resize-widget') {
             if (e.data.isOpen) {
                 iframe.style.width = '400px';
                 iframe.style.height = '600px';
                 iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
                 iframe.style.borderRadius = '16px';
                 
                 // Handle mobile viewport
                 if (window.innerWidth <= 400) {
                     iframe.style.width = '100%';
                     iframe.style.height = '100%';
                     iframe.style.bottom = '0';
                     iframe.style.right = '0';
                     iframe.style.borderRadius = '0';
                 }
             } else {
                 iframe.style.width = '80px';
                 iframe.style.height = '80px';
                 iframe.style.boxShadow = 'none';
                 iframe.style.borderRadius = '50%';
                 iframe.style.bottom = '20px';
                 iframe.style.right = '20px';
             }
        }
    });

    document.body.appendChild(iframe);
})();
