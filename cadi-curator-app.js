let mixpanelInitialized = false;

// Debug mode detection - check for DEBUG=true URL parameter or flag.js value
const DEBUG_MODE = (() => {
    // First check hardcoded value from flag.js (with fallback)
    const hardcodedDebug = (typeof window.AppFlags !== 'undefined' && window.AppFlags.hardcodedDebug) || false;
    
    // Then check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('DEBUG') || urlParams.get('debug');
    const urlDebug = debugParam === 'true' || debugParam === '1';
    
    // Return true if either hardcoded OR URL parameter is true
    return hardcodedDebug || urlDebug;
})();

// Log debug mode status
if (DEBUG_MODE) {
    console.log('🐛 DEBUG MODE ENABLED - Mixpanel tracking is DISABLED');
} else {
    console.log('📊 Production mode - Mixpanel tracking is enabled');
}

// Function to inject Mixpanel script into document head
function injectMixpanelScript() {
    // Skip script injection in DEBUG mode
    if (DEBUG_MODE) {
        console.log('🐛 DEBUG MODE: Skipping Mixpanel script injection');
        return Promise.resolve();
    }
    
    // Check if script is already loaded
    if (typeof mixpanel !== 'undefined' && mixpanel.__SV) {
        console.log('Mixpanel already properly loaded');
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        try {
            // Create the exact Mixpanel stub that matches the official snippet
            if (!window.mixpanel || !window.mixpanel.__SV) {
                window.mixpanel = window.mixpanel || [];
                window.mixpanel._i = window.mixpanel._i || [];
                
                // Initialize function that creates instances
                window.mixpanel.init = function(token, config, name) {
                    var target = window.mixpanel;
                    if (typeof name !== 'undefined') {
                        target = window.mixpanel[name] = [];
                    } else {
                        name = 'mixpanel';
                    }
                    
                    target.people = target.people || [];
                    target.toString = function(no_stub) {
                        var str = 'mixpanel';
                        if (name !== 'mixpanel') {
                            str += '.' + name;
                        }
                        if (!no_stub) {
                            str += ' (stub)';
                        }
                        return str;
                    };
                    
                    target.people.toString = function() {
                        return target.toString(1) + '.people (stub)';
                    };
                    
                    // List of methods to stub (exact from official snippet)
                    var methods = 'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(' ');
                    
                    function stub_method(method_name) {
                        var method_parts = method_name.split('.');
                        if (method_parts.length === 2) {
                            var obj = target[method_parts[0]];
                            obj[method_parts[1]] = function() {
                                obj.push([method_parts[1]].concat(Array.prototype.slice.call(arguments, 0)));
                            };
                        } else {
                            target[method_name] = function() {
                                target.push([method_name].concat(Array.prototype.slice.call(arguments, 0)));
                            };
                        }
                    }
                    
                    for (var i = 0; i < methods.length; i++) {
                        stub_method(methods[i]);
                    }
                    
                    // Create get_group method
                    var group_methods = 'set set_once union unset remove delete'.split(' ');
                    target.get_group = function() {
                        function group_stub(method) {
                            group_obj[method] = function() {
                                var call2_args = arguments;
                                var call2 = [method].concat(Array.prototype.slice.call(call2_args, 0));
                                target.push([group_key, call2]);
                            };
                        }
                        var group_obj = {};
                        var group_key = ['get_group'].concat(Array.prototype.slice.call(arguments, 0));
                        for (var j = 0; j < group_methods.length; j++) {
                            group_stub(group_methods[j]);
                        }
                        return group_obj;
                    };
                    
                    window.mixpanel._i.push([token, config, name]);
                };
                
                // Version marker (crucial for avoiding version mismatch)
                window.mixpanel.__SV = 1.2;
                
                console.log('Official Mixpanel stub created with version 1.2');
            }
            
            // Load the real Mixpanel library
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
            
            script.onload = function() {
                console.log('Real Mixpanel library loaded from CDN');
                
                setTimeout(() => {
                    if (typeof window.mixpanel.init === 'function' && window.mixpanel.__SV) {
                        console.log('Mixpanel is ready with version:', window.mixpanel.__SV);
                        resolve();
                    } else {
                        reject(new Error('Mixpanel library loaded but not properly initialized'));
                    }
                }, 300);
            };
            
            script.onerror = function(error) {
                console.error('Failed to load Mixpanel library:', error);
                reject(error);
            };
            
            document.head.appendChild(script);
            console.log('Loading official Mixpanel library...');
            
        } catch (error) {
            console.error('Error setting up Mixpanel:', error);
            reject(error);
        }
    });
}

// Initialize Mixpanel
function initializeMixpanel() {
    // Skip Mixpanel initialization in DEBUG mode
    if (DEBUG_MODE) {
        console.log('🐛 DEBUG MODE: Skipping Mixpanel initialization');
        return;
    }
    
    try {
      if (typeof mixpanel !== 'undefined') {
        // Use a demo/test token - replace with your actual Mixpanel project token
        mixpanel.init('8f1255a44f049242c9e18330c539d156', {
          debug: true,
          track_pageview: false, // Disable automatic pageview tracking
          persistence: 'localStorage',
          // Disable geolocation to avoid data format issues
          ip: false,
          // Additional config for reliability
          ignore_dnt: false,
          // Remove property_blacklist as it can cause issues
          batch_requests: false, // Send requests one by one, not batched
          cross_subdomain_cookie: false
        });
        mixpanelInitialized = true;
        console.log('Mixpanel initialized successfully');
        
        // Track initial page load with comprehensive data - delay to ensure Mixpanel is fully ready
        setTimeout(() => {
          try {
            surveyTracking.trackPageView('photo_gallery');
            console.log('Initial photo gallery page view tracked');
          } catch (error) {
            console.error('Error tracking initial page view:', error);
          }
        }, 1000); // Increased delay to 1000ms
        
        // Add error callback for better debugging
        mixpanel.set_config({
          error: function(msg) {
            console.error('Mixpanel configuration error:', msg);
          }
        });
      }
    } catch (error) {
      console.error('Error initializing Mixpanel:', error);
      // Check if it's a network connectivity issue
      if (error && error.status === 0) {
        console.warn('Network error detected. This might be due to:');
        console.warn('1. Ad blocker blocking Mixpanel requests');
        console.warn('2. Network connectivity issues');
        console.warn('3. CORS or firewall blocking');
        console.warn('Consider setting up a proxy server as per Mixpanel docs');
      }
    }
  }
    

// Simplified mixpanel tracking functions focused on page views and button clicks
const surveyTracking = {
    /**
     * Sanitize property values for Mixpanel
     */
    sanitizeValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        
        // Convert to string and limit length
        const stringValue = String(value);
        if (stringValue.length > 255) {
            return stringValue.substring(0, 255);
        }
        
        // Remove any problematic characters
        return stringValue.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    },

    /**
     * Track page view events
     */
    trackPageView(pageType) {
        // Skip tracking in DEBUG mode 
        if (DEBUG_MODE) {
            return;
        }

        if (mixpanelInitialized && typeof mixpanel !== 'undefined') {
            try {
                const pageViewData = {
                    page: this.sanitizeValue(pageType),
                    survey_type: 'cadillac_brand_perception',
                    page_type: this.sanitizeValue(pageType),
                    user_agent: this.sanitizeValue(navigator.userAgent),
                    screen_width: window.screen.width,
                    screen_height: window.screen.height,
                    viewport_width: window.innerWidth,
                    viewport_height: window.innerHeight
                };

                mixpanel.track('Page View', pageViewData);

                console.log(`${pageType} page view tracked in Mixpanel`);
            } catch (error) {
                console.error('Error tracking page view:', error);
                if (error && error.status === 0) {
                    console.warn('Network error - check ad blockers, proxy setup, or connectivity');
                } else if (error && error.status === 1) {
                    console.warn('Data format error in page view - check property names, values, and data types');
                }
            }
        }
    },

    /**
     * Track social media button clicks
     */
    trackSocialButtonClick(platform, buttonId = null) {
        // Skip tracking in DEBUG mode
        if (DEBUG_MODE) {
            return;
        }

        if (mixpanelInitialized && typeof mixpanel !== 'undefined') {
            try {
                const socialClickData = {
                    platform: this.sanitizeValue(platform),
                    button_id: this.sanitizeValue(buttonId),
                    page: 'photo_gallery',
                    survey_type: 'cadillac_brand_perception',
                    user_agent: this.sanitizeValue(navigator.userAgent),
                    screen_width: window.screen.width,
                    screen_height: window.screen.height,
                    viewport_width: window.innerWidth,
                    viewport_height: window.innerHeight,
                    timestamp: new Date().toISOString()
                };

                mixpanel.track('Share Completed', socialClickData);

                console.log(`${platform} button click tracked in Mixpanel`);
            } catch (error) {
                console.error('Error tracking social button click:', error);
                if (error && error.status === 0) {
                    console.warn('Network error - check ad blockers, proxy setup, or connectivity');
                } else if (error && error.status === 1) {
                    console.warn('Data format error in social tracking - check property names, values, and data types');
                }
            }
        }
    }
};


// Function to inject survey styles at runtime
     function injectSurveyStyles() {
         const styles = `
         /* Cadillac Gothic Font */
         @font-face {
           font-family: "CadillacGothic";
           src: url("https://cdn.jsdelivr.net/gh/zqyoiv/728-cadi-curator@main/asset/CadillacGothic-Regular.otf")
                format("opentype");
           font-weight: normal;
           font-style: normal;
           font-display: swap;
         }
         
         @font-face {
           font-family: 'CadillacGothicWide';
           src: url('https://cdn.jsdelivr.net/gh/zqyoiv/728-cadi-curator@main/asset/CadillacGothic-WideRegular.otf')
                format('opentype');
           font-weight: 400;
           font-style: normal;
           font-display: swap;
         }

        /* modern browsers (iOS 15.4+, Chrome 108+, Firefox 109+) */
        #container{
            height: 100dvh;          /* dynamic viewport height – tracks bar show/hide */
            /* ↓ graceful fallback for anything that doesn’t understand dvh */
            height: 100vh;           
            overflow-y: auto;        /* allow vertical scroll when content overflows */
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
        }

        /* if you use vh elsewhere, switch those too */
        #container{
            margin-top: 25vh !important;
        }
         
        /* Logo Div Styles */
        .cadillac-logo {
            width: 100%;
            text-align: center;
            margin-bottom: min(2vh, 20px);
            padding: min(3vh, 20px) 0;
        }
        
        .cadillac-logo img {
            object-fit: contain;
            display: block;
            margin: 0 auto;
        }
         
         /* Main Gallery Page Styles */
         html, body, body#i1xr {
             background: #000000 !important;
             font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             margin: 0 !important;
             padding: 0 !important;
             height: 100vh !important;
             overflow: hidden !important;
         }
         
         body#i1xr .event-banner {
             display: none !important;
             opacity: 0 !important;
             transition: opacity 0.5s ease !important;
         }
         
         /* Logo Div for Photo Page */
         body#i1xr .cadillac-logo {
             top: 0 !important;
             left: 0 !important;
             width: 100% !important;
             text-align: center !important;
             padding: min(10vh, 50px) 0 !important;
             z-index: 101 !important;
             opacity: 0 !important;
             transition: opacity 0.5s ease !important;
         }

         body#i1xr .cadillac-logo img {
             width: 100px !important;
             object-fit: contain !important;
             display: block !important;
             margin: 2vh auto 0 auto !important;
         }
         
         body#i1xr #container {
             background: #000000 !important;
             text-align: center !important;
             width: 100% !important;
             margin: 0 auto !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
             justify-content: flex-start !important;
             height: 75vh !important;
             overflow-y: auto !important;
             overflow-x: hidden !important;
             -webkit-overflow-scrolling: touch;
             box-sizing: content-box !important;
             opacity: 0 !important;
             transition: opacity 0.5s ease !important;
         }
         
         body#i1xr #photo-container {
             background: #000000 !important;
             max-width: min(90vw, 600px) !important;
             margin: 0 auto !important;
             padding: 0 min(3vw, 20px) !important;
             text-align: center !important;
             width: 100% !important;
             box-sizing: border-box !important;
             flex-shrink: 0 !important;
         }
         
         body#i1xr #header-container {
             display: none !important;
         }
         
         body#i1xr #title {
             color: white !important;
             font-family: "CadillacGothicWide", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             font-size: clamp(20px, 4vw, 28px) !important;
             font-weight: normal !important;
             letter-spacing: 0 !important;
             text-transform: uppercase !important;
             margin: 0 auto min(2vh, 10px) auto !important;
             line-height: 1.2 !important;
             text-align: center !important;
             width: 100% !important;
             display: block !important;
         }
         
         body#i1xr #time {
             color: transparent !important; /* Hide original content */
             font-size: 0 !important; /* Hide original content */
             overflow: hidden !important; /* Hide original content */
             font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             margin: min(3vh, 20px) auto !important;
             text-align: center !important;
             width: 100% !important;
             display: block !important;
         }
         
         body#i1xr #time::before {
             content: "Click below" !important;
             color: white !important;
             font-size: 12px !important;
             font-weight: bold !important;
             text-align: center !important;
             display: inline !important;
         }
         
         body#i1xr #time::after {
             content: " to download and share your Theme Art." !important;
             color: white !important;
             font-size: 12px !important;
             font-weight: normal !important;
             text-align: center !important;
             display: inline !important;
         }
         
         body#i1xr .clv-photo {
             width: 100% !important;
             height: auto !important;
             max-width: 70vw !important;
                max-height: 50vh !important;
             margin: min(4vh, 30px) auto !important;
             display: block !important;
             border-radius: clamp(4px, 1vw, 8px) !important;

             object-fit: contain !important;
         }

         /* Video Preview Frame */
         body#i1xr .video-frame {
             position: relative !important;
             width: 100% !important;
             max-width: min(70vw, 420px) !important;
             margin: min(4vh, 30px) auto !important;
             border: 1px solid rgba(255, 255, 255, 0.5) !important;
             border-radius: clamp(4px, 1vw, 8px) !important;
             overflow: hidden !important;
             background: #000000 !important;
         }

         body#i1xr .video-frame .clv-photo {
             max-width: 100% !important;
             margin: 0 !important;
             border-radius: 0 !important;
         }

         body#i1xr .video-frame .video-preview-label {
             position: absolute !important;
             left: 0 !important;
             right: 0 !important;
             bottom: 0 !important;
             margin: 0 !important;
             background: linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0)) !important;
             color: #eeeeee !important;
             font-family: "CadillacGothicWide", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             font-size: 11px !important;
             letter-spacing: 3px !important;
             text-transform: uppercase !important;
             text-align: center !important;
             padding: min(3vh, 18px) 0 min(1.5vh, 10px) 0 !important;
             pointer-events: none !important;
         }

         body#i1xr .video-frame .video-play-toggle {
             position: absolute !important;
             top: 50% !important;
             left: 50% !important;
             transform: translate(-50%, -50%) !important;
             width: min(15vw, 56px) !important;
             height: min(15vw, 56px) !important;
             min-width: 44px !important;
             min-height: 44px !important;
             border-radius: 50% !important;
             background: rgba(0, 0, 0, 0.55) !important;
             border: none !important;
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             cursor: pointer !important;
             padding: 0 !important;
             transition: opacity 0.2s ease !important;
         }

         body#i1xr .video-frame .video-play-toggle svg {
             width: 40% !important;
             height: 40% !important;
             fill: white !important;
             margin-left: 2px !important;
         }

         body#i1xr .video-frame.is-playing .video-play-toggle {
             opacity: 0 !important;
             pointer-events: none !important;
         }

         /* Arrival Moment Heading */
         body#i1xr .arrival-heading {
             color: #eeeeee !important;
             font-family: "CadillacGothicWide", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             font-size: clamp(15px, 3.2vw, 20px) !important;
             font-weight: normal !important;
             letter-spacing: 2px !important;
             line-height: 1.6 !important;
             text-transform: uppercase !important;
             text-align: center !important;
             margin: min(4vh, 26px) auto min(3vh, 20px) auto !important;
             max-width: min(80vw, 380px) !important;
         }

         /* Download + Share (hidden until download is ready) */
         body#i1xr #download-share-wrap {
             width: 100% !important;
             max-width: min(85vw, 380px) !important;
             margin: 0 auto !important;
             display: flex !important;
             flex-direction: column !important;
             align-items: center !important;
         }

         body#i1xr #download-share-wrap.is-hidden {
             display: none !important;
         }

         body#i1xr .arrival-download-button {
             display: block !important;
             width: 100% !important;
             padding: min(2vh, 14px) min(4vw, 20px) !important;
             background: transparent !important;
             color: white !important;
             border: 2px solid white !important;
             border-radius: 0 !important;
             font-size: 12px !important;
             letter-spacing: 2px !important;
             text-transform: uppercase !important;
             text-decoration: none !important;
             cursor: pointer !important;
             font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             box-sizing: border-box !important;
             margin: 0 0 min(3vh, 20px) 0 !important;
         }

         body#i1xr .arrival-download-button:hover {
             background: rgba(255, 255, 255, 0.15) !important;
         }

         body#i1xr #download-share-wrap #social-container {
             margin-top: 0 !important;
             padding: 0 !important;
         }

         /* Hashtag / Handle Footer (always visible) */
         body#i1xr .arrival-hashtag-footer {
             color: #eeeeee !important;
             font-family: "CadillacGothicWide", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             font-size: 12px !important;
             letter-spacing: 2px !important;
             line-height: 1.9 !important;
             text-transform: uppercase !important;
             text-align: center !important;
             margin: min(3vh, 20px) auto 0 auto !important;
         }

         body#i1xr #igm34 {
             display: none !important;
         }
         
         body#i1xr #social-container {
             background-color: transparent !important;
             padding: min(4vh, 30px) min(3vw, 20px) !important;
             justify-content: center !important;
             gap: min(4vw, 30px) !important;
             flex-wrap: wrap !important;
             margin-top: min(5vh, 40px) !important;
             display: flex !important;
             width: 100% !important;
             text-align: center !important;
             align-items: center !important;
             flex-shrink: 0 !important;
         }
         
         body#i1xr .clv-button.circle,
         body#i1xr a.clv-button.circle {
             background-color: black !important;
             background: black !important;
             border: 1px solid rgba(255, 255, 255, 0.6) !important;
             width: min(12vw, 70px) !important;
             height: min(12vw, 70px) !important;
             min-width: 50px !important;
             min-height: 50px !important;
             border-radius: 50% !important;
             align-items: center !important;
             justify-content: center !important;
             transition: all 0.2s ease !important;
 
             position: relative !important;
             text-decoration: none !important;
         }
         
         body#i1xr .clv-button.circle:hover,
         body#i1xr a.clv-button.circle:hover {
             background-color: rgba(0, 0, 0, 0.8) !important;
             background: rgba(0, 0, 0, 0.8) !important;
             transform: scale(1.1) !important;
 
         }
         
         body#i1xr .clv-button.circle div,
         body#i1xr a.clv-button.circle div {
             display: flex !important;
             align-items: center !important;
             justify-content: center !important;
             width: 100% !important;
             height: 100% !important;
             background: transparent !important;
         }
         
         body#i1xr .clv-button.circle svg,
         body#i1xr a.clv-button.circle svg,
         body#i1xr .clv-button.circle div svg,
         body#i1xr a.clv-button.circle div svg {
             width: min(6vw, 35px) !important;
             height: min(6vw, 35px) !important;
             min-width: 20px !important;
             min-height: 20px !important;
             fill: white !important;
             color: white !important;
             display: block !important;
             margin: 0 auto !important;
             background: transparent !important;
         }
         
                 body#i1xr .clv-button.circle svg path,
        body#i1xr a.clv-button.circle svg path,
        body#i1xr .clv-button.circle div svg path,
        body#i1xr a.clv-button.circle div svg path {
            fill: white !important;
            color: white !important;
        }
         
         body#i1xr #iqeeok {
             background-color: transparent !important;
             color: white !important;
             text-align: center !important;
             padding: min(3vh, 20px) !important;
             font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
             width: 100% !important;
             margin: 0 auto !important;
             font-size: clamp(12px, 2.5vw, 16px) !important;
             flex-shrink: 0 !important;
         }
        
        @media (max-width: 450px) {
            body#i1xr .cadillac-logo {
                padding: 0 !important;
            }

            body#i1xr .cadillac-logo img {
                padding: 0 !important;
                margin: 7vh auto 0 auto !important;
            }

            body#i1xr {
                background-size: min(80vw, 200px) !important;
            }
            
            
            body#i1xr #photo-container {
                padding: 0 min(2vw, 15px) !important;
            }

            body#i1xr #title {
                font-size: 14px !important;
                letter-spacing: clamp(0.5px, 0.1vw, 1px) !important;
            }

            body#i1xr .video-frame {
                max-width: 85vw !important;
                margin: min(2vh, 16px) auto !important;
            }

            body#i1xr .video-frame .clv-photo {
                max-height: 45svh !important;
            }

            body#i1xr #social-container {
                gap: 0 !important;
                padding: 0 !important;
                margin-top: 2vh !important;
            }
            
            body#i1xr .clv-button.circle,
            body#i1xr a.clv-button.circle {
                width: min(18vw, 55px) !important;
                height: min(18vw, 55px) !important;
                min-width: 40px !important;
                min-height: 40px !important;
            }
            
            body#i1xr .clv-button.circle svg,
            body#i1xr a.clv-button.circle svg,
            body#i1xr .clv-button.circle div svg,
            body#i1xr a.clv-button.circle div svg {
                width: min(10vw, 30px) !important;
                height: min(10vw, 30px) !important;
                min-width: 15px !important;
                min-height: 15px !important;
            }
            
            body#i1xr #iqeeok {
                font-size: clamp(10px, 3vw, 14px) !important;
                padding: min(2vh, 15px) !important;
            }
            
        }

        @media (max-aspect-ratio: 9/16) {
            body#i1xr .cadillac-logo img {
                margin: 7vh auto 0 auto !important;
            }
        }

        @media (max-width: 400px) and (max-aspect-ratio: 3/4) {
            body#i1xr .cadillac-logo img {
                margin: 3vh auto 0 auto !important;
            }
        }
        
        
        /* Force Hide Title Element */
        #title,
        .event-name,
        div#title.event-name {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            left: -9999px !important;
            z-index: -1 !important;
        }
        
         `;
         
         // Create style element
         const styleElement = document.createElement('style');
         styleElement.type = 'text/css';
         styleElement.id = 'survey-dynamic-styles';
         
         // Add styles to the element
         if (styleElement.styleSheet) {
             // IE support
             styleElement.styleSheet.cssText = styles;
         } else {
             styleElement.appendChild(document.createTextNode(styles));
         }
         
         // Append to head
         document.head.appendChild(styleElement);
         }

// Function to show video page elements with fade-in effect
function showVideoPageElements() {
    // Show the main logo
    const logo = document.querySelector('.cadillac-logo');
    if (logo) {
        logo.style.setProperty('opacity', '1', 'important');
    }
    
    // Show the event banner
    const eventBanner = document.querySelector('.event-banner');
    if (eventBanner) {
        eventBanner.style.setProperty('opacity', '1', 'important');
    }
    
    // Show the container
    const container = document.getElementById('container');
    if (container) {
        container.style.setProperty('opacity', '1', 'important');
    }
    
    console.log('Video page elements shown');
}

// Function to add logo to photo page
function addLogoToPhotoPage() {
    // Check if logo already exists
    if (document.querySelector('.cadillac-logo')) {
        return;
    }
    
    // Create logo container
    const logoDiv = document.createElement('div');
    logoDiv.className = 'cadillac-logo';
    logoDiv.innerHTML = `
        <img src="https://cdn.jsdelivr.net/gh/zqyoiv/728-cadi-curator@main/asset/Cadillac-Logo_white_small.png" alt="Cadillac Logo">
    `;

    // Insert at the beginning of body
    document.body.insertBefore(logoDiv, document.body.firstChild);

    console.log('Logo added to photo page');
}

// Function to clear time div content and let CSS handle the text
function clearTimeContent() {
    const timeElement = document.getElementById('time');
    if (timeElement) {
        // Clear all text content from the time div
        timeElement.innerHTML = '';
        timeElement.textContent = '';
        console.log('Time div content cleared - CSS ::before and ::after will handle text');
    }
}

// Function to control video playback (called on page load)
function setupVideoControls() {
    const video = document.querySelector('video.clv-photo');
    if (video) {
        // Remove loop attribute and native controls - the custom play/pause
        // toggle from buildVideoPreviewFrame() replaces native UI
        video.loop = false;
        video.removeAttribute('loop');
        video.removeAttribute('controls');

        // Add event listener for when video ends
        video.addEventListener('ended', function() {
            video.pause();
            video.currentTime = video.duration;   // keep last frame (iOS quirk-safe)
        });

        // Restart the video
        video.currentTime = 0;
        video.play().catch(error => {
            console.log('Video play failed:', error);
        });

        console.log('Video controls setup: no loop, will pause when ended, restarted playback');
    } else {
        console.log('Video element with class clv-photo not found');
    }
}

// Wraps the existing video in a bordered frame with a "Video Preview" label
// and a custom play/pause toggle, replacing the native video controls
function buildVideoPreviewFrame() {
    const video = document.querySelector('video.clv-photo');
    if (!video) return;

    const wrapper = video.parentElement;
    if (!wrapper) return;
    wrapper.classList.add('video-frame');

    const label = document.createElement('div');
    label.className = 'video-preview-label';
    label.textContent = 'Preview';
    wrapper.appendChild(label);

    const playToggle = document.createElement('button');
    playToggle.type = 'button';
    playToggle.className = 'video-play-toggle';
    playToggle.setAttribute('aria-label', 'Play video');
    playToggle.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"></path></svg>';
    wrapper.appendChild(playToggle);

    function syncPlayState() {
        wrapper.classList.toggle('is-playing', !video.paused && !video.ended);
    }

    playToggle.addEventListener('click', function() {
        if (video.paused || video.ended) {
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    });

    video.addEventListener('play', syncPlayState);
    video.addEventListener('pause', syncPlayState);
    video.addEventListener('ended', syncPlayState);
    syncPlayState();
}

// Function to add viewport meta tag
function addViewportMetaTag() {
    // Check if viewport meta tag already exists
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (existingViewport) {
        // Update existing meta tag
        existingViewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
        console.log('Updated existing viewport meta tag');
    } else {
        // Create new viewport meta tag
        const metaTag = document.createElement('meta');
        metaTag.name = 'viewport';
        metaTag.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
        
        // Insert into document head
        document.head.appendChild(metaTag);
        console.log('Added new viewport meta tag');
    }
}

// Styles for the mandatory "start download" dialog and the linear progress
// bar that takes the place of the share buttons while the video is fetching.
function injectDownloadFlowStyles() {
    const styles = `
        #start-download-modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 200;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4vw;
            box-sizing: border-box;
        }

        #start-download-modal .start-download-card {
            background: #111111;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: min(4vh, 30px) min(6vw, 30px);
            max-width: min(85vw, 360px);
            width: 100%;
            box-sizing: border-box;
            text-align: center;
            color: white;
            font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        #start-download-modal .start-download-title {
            font-size: 13px;
            letter-spacing: 1px;
            line-height: 1.5;
            margin: 0 0 min(3vh, 20px) 0;
            color: #eeeeee;
        }

        #start-download-modal .start-download-button {
            width: 100%;
            padding: min(2vh, 14px) min(4vw, 20px);
            background: transparent;
            color: white;
            border: 2px solid white;
            border-radius: 0;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            cursor: pointer;
            font-family: inherit;
            box-sizing: border-box;
        }

        #start-download-modal .start-download-button:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .download-progress-wrap {
            width: 100%;
            max-width: min(85vw, 400px);
            margin: min(4vh, 30px) auto;
            text-align: center;
            color: white;
            font-family: "CadillacGothic", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            box-sizing: border-box;
        }

        .download-progress-label {
            font-size: 12px;
            letter-spacing: 1px;
            color: #eeeeee;
            margin-bottom: 10px;
        }

        .download-progress-track {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            overflow: hidden;
        }

        .download-progress-fill {
            height: 100%;
            width: 0%;
            background: #ffffff;
            transition: width 0.15s ease;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = 'download-flow-styles';
    styleElement.appendChild(document.createTextNode(styles));
    document.head.appendChild(styleElement);
}

// Mandatory dialog shown on load. There is no skip/close - tapping the CTA is
// the only way forward, since that tap's user-activation is what makes the
// download fetch below (and every later share-button tap) work reliably.
function showStartDownloadModal() {
    const modal = document.createElement('div');
    modal.id = 'start-download-modal';
    modal.innerHTML = `
        <div class="start-download-card">
            <p class="start-download-title">Tap below to prepare your Theme Art for download</p>
            <button type="button" class="start-download-button" id="start-download-button">Start My Download</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('start-download-button').addEventListener('click', beginDownloadFlow);
}

function removeStartDownloadModal() {
    const modal = document.getElementById('start-download-modal');
    if (modal) modal.remove();
}

// Spends the modal tap's user-activation on the real fetch, so that by the
// time the (now revealed) download button/share icons are tapped for real,
// sharing.js's fileCache is already warm and handleFileDownload resolves
// instantly - preserving that later click's own fresh activation through to
// navigator.share()/downloadFile(). The download button + share icons stay
// hidden behind the progress bar until the fetch completes.
async function beginDownloadFlow() {
    removeStartDownloadModal();

    const shareWrap = document.getElementById('download-share-wrap');
    if (shareWrap) shareWrap.classList.add('is-hidden');

    const overlay = showLoadingOverlay();
    try {
        if (typeof handleFileDownload === 'function' && typeof photo !== 'undefined' && photo.download) {
            await handleFileDownload(photo.download, {
                onProgress: ({ receivedLength, contentLength }) => {
                    overlay.update(receivedLength / contentLength);
                }
            });
        }
    } catch (error) {
        console.error('Error downloading shareable:', error);
    } finally {
        overlay.close();
        if (shareWrap) shareWrap.classList.remove('is-hidden');
    }
}

// Overrides sharing.js's default circular-spinner showLoadingOverlay with a
// linear, left-to-right progress bar. Must be assigned (not declared as a
// top-level `function`) from inside DOMContentLoaded-gated init code: this
// script runs before the deferred sharing.js does, so a top-level declaration
// here would get overwritten once sharing.js's own version runs afterward.
function installCustomLoadingOverlay() {
    window.showLoadingOverlay = function() {
        const wrap = document.createElement('div');
        wrap.className = 'download-progress-wrap';
        wrap.innerHTML = `
            <div class="download-progress-label">Preparing your download (0%)</div>
            <div class="download-progress-track">
                <div class="download-progress-fill"></div>
            </div>
        `;

        const shareWrap = document.getElementById('download-share-wrap');
        if (shareWrap && shareWrap.parentNode) {
            shareWrap.parentNode.insertBefore(wrap, shareWrap);
        } else {
            document.body.appendChild(wrap);
        }

        const label = wrap.querySelector('.download-progress-label');
        const fill = wrap.querySelector('.download-progress-fill');

        function update(value) {
            const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
            fill.style.width = `${Math.round(v * 100)}%`;
            label.textContent = `Preparing your download (${Math.round(v * 100)}%)`;
        }

        function close() {
            if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }

        return { update, close };
    };
}

// Builds the "Download or Share Your Arrival Moment" heading, the wide
// Download button, and trims/reorders the social icons down to Instagram,
// TikTok, X - matching the approved layout. The download button + icon row
// are wrapped together and start hidden; beginDownloadFlow() reveals the
// wrap once the file is ready. The heading and hashtag footer are always
// visible.
function buildDownloadShareLayout() {
    const photoContainer = document.getElementById('photo-container');
    const socialContainer = document.getElementById('social-container');
    if (!photoContainer || !socialContainer) return;

    // Trim social-container down to Instagram, TikTok, X and put them in
    // that order
    const keepIds = ['iok7r', 'i2cwn', 'i5jm2'];
    Array.from(socialContainer.children).forEach(child => {
        if (!keepIds.includes(child.id)) {
            child.remove();
        }
    });
    keepIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) socialContainer.appendChild(el);
    });

    const heading = document.createElement('div');
    heading.className = 'arrival-heading';
    heading.innerHTML = 'Download or<br>Share Your<br>Arrival Moment';

    // Mirrors the share attributes that used to live on the circular
    // download icon, so the existing sharing.js share(this) handler works
    // unchanged on this restyled button
    const downloadButton = document.createElement('a');
    downloadButton.id = 'arrival-download-button';
    downloadButton.className = 'arrival-download-button';
    downloadButton.textContent = 'Download';
    downloadButton.setAttribute('title', 'Download');
    downloadButton.setAttribute('clv-click-id', 'download');
    downloadButton.setAttribute('share-type', 'download');
    downloadButton.setAttribute('share-fallback', 'download');
    downloadButton.setAttribute('onclick', 'share(this)');
    downloadButton.setAttribute('role', 'button');
    downloadButton.setAttribute('tabindex', '0');

    const wrap = document.createElement('div');
    wrap.id = 'download-share-wrap';
    wrap.className = 'is-hidden';
    wrap.appendChild(downloadButton);
    wrap.appendChild(socialContainer);

    const footer = document.createElement('div');
    footer.className = 'arrival-hashtag-footer';
    footer.innerHTML = '#CadillacUSOpen<br>@Cadillac';

    photoContainer.appendChild(heading);
    photoContainer.appendChild(wrap);
    photoContainer.appendChild(footer);
}

// Startup code - inject Mixpanel script and initialize everything
function initializePhotoPage() {
    addLogoToPhotoPage();
    showVideoPageElements();
    clearTimeContent();
    setupVideoControls();
    buildVideoPreviewFrame();
    replaceSocialIcons();
    buildDownloadShareLayout();
    setupSocialMediaTracking();
    injectDownloadFlowStyles();
    installCustomLoadingOverlay();
    showStartDownloadModal();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        addViewportMetaTag();
        injectSurveyStyles();

        injectMixpanelScript().then(() => {
            initializeMixpanel();
        }).catch(error => {
            console.error('Failed to inject Mixpanel script:', error);
        });

        initializePhotoPage();
    });
} else {
    // DOM is already loaded
    addViewportMetaTag();
    injectSurveyStyles();

    injectMixpanelScript().then(() => {
        initializeMixpanel();
    }).catch(error => {
        console.error('Failed to inject Mixpanel script:', error);
    });

    initializePhotoPage();
}

// Function to set up social media button tracking
function setupSocialMediaTracking() {
    // Add click event listeners for social media buttons
    setTimeout(() => {
        // TikTok button (i2cwn)
        const tiktokButton = document.getElementById('i2cwn');
        if (tiktokButton && !tiktokButton.dataset.trackingAdded) {
            tiktokButton.addEventListener('click', function() {
                surveyTracking.trackSocialButtonClick('tiktok', 'i2cwn');
            });
            tiktokButton.dataset.trackingAdded = 'true';
            console.log('TikTok button tracking added');
        }

        // Instagram button (iok7r)
        const instagramButton = document.getElementById('iok7r');
        if (instagramButton && !instagramButton.dataset.trackingAdded) {
            instagramButton.addEventListener('click', function() {
                surveyTracking.trackSocialButtonClick('instagram', 'iok7r');
            });
            instagramButton.dataset.trackingAdded = 'true';
            console.log('Instagram button tracking added');
        }

        // X (Twitter) button (i5jm2)
        const xButton = document.getElementById('i5jm2');
        if (xButton && !xButton.dataset.trackingAdded) {
            xButton.addEventListener('click', function() {
                surveyTracking.trackSocialButtonClick('x_twitter', 'i5jm2');
            });
            xButton.dataset.trackingAdded = 'true';
            console.log('X/Twitter button tracking added');
        }

        // Download button (arrival-download-button)
        const downloadButton = document.getElementById('arrival-download-button');
        if (downloadButton && !downloadButton.dataset.trackingAdded) {
            downloadButton.addEventListener('click', function() {
                surveyTracking.trackSocialButtonClick('download', 'arrival-download-button');
            });
            downloadButton.dataset.trackingAdded = 'true';
            console.log('Download button tracking added');
        }
    }, 1000); // Delay to ensure buttons are rendered
}

// Function to replace Instagram, X, and TikTok icons with black background, white fill versions
function replaceSocialIcons() {
    // Replace Instagram icon
    const instagramButton = document.getElementById('iok7r');
    if (instagramButton) {
        const instagramDiv = instagramButton.querySelector('div');
        if (instagramDiv) {
            instagramDiv.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.1" viewBox="0 0 72 72" width="50px" height="50px">
                    <defs>
                        <style>
                            .st0 {
                                fill: #fff;
                            }
                        </style>
                    </defs>
                    <path class="st0" d="M36,1.83c-9.29,0-10.45.04-14.1.21-3.64.17-6.13.74-8.3,1.59-2.25.87-4.16,2.04-6.06,3.94-1.9,1.9-3.07,3.81-3.95,6.05-.85,2.17-1.43,4.66-1.59,8.29-.16,3.65-.21,4.81-.21,14.09s.04,10.44.21,14.09c.17,3.64.74,6.12,1.59,8.29.87,2.25,2.04,4.15,3.94,6.05,1.9,1.9,3.81,3.07,6.06,3.94,2.18.85,4.66,1.42,8.3,1.59,3.65.17,4.81.21,14.1.21s10.45-.04,14.1-.21c3.64-.17,6.13-.74,8.3-1.59,2.25-.87,4.15-2.04,6.05-3.94,1.9-1.9,3.07-3.81,3.95-6.05.84-2.17,1.42-4.66,1.59-8.29.16-3.65.21-4.81.21-14.09s-.04-10.45-.21-14.09c-.17-3.64-.75-6.12-1.59-8.29-.88-2.25-2.04-4.15-3.95-6.05-1.9-1.9-3.8-3.07-6.06-3.94-2.18-.85-4.67-1.42-8.31-1.59-3.65-.17-4.81-.21-14.1-.21h.01ZM32.94,7.98c.91,0,1.93,0,3.07,0,9.13,0,10.21.03,13.82.2,3.33.15,5.14.71,6.35,1.18,1.6.62,2.73,1.36,3.93,2.56,1.2,1.2,1.94,2.34,2.56,3.93.47,1.2,1.03,3.01,1.18,6.34.16,3.6.2,4.68.2,13.81s-.04,10.2-.2,13.81c-.15,3.33-.71,5.14-1.18,6.34-.62,1.59-1.36,2.73-2.56,3.93-1.2,1.2-2.33,1.94-3.93,2.56-1.2.47-3.02,1.03-6.35,1.18-3.61.16-4.69.2-13.82.2s-10.21-.04-13.82-.2c-3.33-.15-5.14-.71-6.35-1.18-1.6-.62-2.74-1.36-3.93-2.56-1.2-1.2-1.94-2.33-2.56-3.93-.47-1.2-1.03-3.01-1.18-6.34-.16-3.6-.2-4.68-.2-13.81s.03-10.2.2-13.81c.15-3.33.71-5.14,1.18-6.35.62-1.59,1.36-2.73,2.56-3.93,1.2-1.2,2.34-1.94,3.93-2.56,1.21-.47,3.02-1.03,6.35-1.18,3.15-.14,4.38-.19,10.75-.19h0ZM54.26,13.66c-2.27,0-4.1,1.83-4.1,4.1s1.84,4.1,4.1,4.1,4.1-1.84,4.1-4.1-1.84-4.1-4.1-4.1h0ZM36,18.45c-9.7,0-17.56,7.86-17.56,17.55s7.86,17.55,17.56,17.55,17.56-7.85,17.56-17.55-7.86-17.55-17.56-17.55h0ZM36,24.61c6.3,0,11.4,5.1,11.4,11.39s-5.1,11.39-11.4,11.39-11.4-5.1-11.4-11.39,5.1-11.39,11.4-11.39h0Z"/>
                </svg>
            `;
        }
    }

    // Replace X icon
    const xButton = document.getElementById('i5jm2');
    if (xButton) {
        const xDiv = xButton.querySelector('div');
        if (xDiv) {
            xDiv.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.1" viewBox="0 0 72 72" width="50px" height="50px">
                    <defs>
                        <style>
                            .st0 {
                                fill: #fff;
                            }
                        </style>
                    </defs>
                    <path class="st0" d="M55.84,5.12h10.48l-23.02,26.21,26.9,35.56h-21.11l-16.52-21.61-18.92,21.61H3.17l24.39-28.03L1.8,5.12h21.63l14.93,19.74L55.84,5.12ZM52.17,60.73h5.81L20.38,11.04h-6.25l38.04,49.69Z"/>
                </svg>
            `;
        }
    }



    // Replace TikTok icon
    const tiktokIconButton = document.getElementById('i2cwn');
    if (tiktokIconButton) {
        const tiktokIconDiv = tiktokIconButton.querySelector('div');
        if (tiktokIconDiv) {
            tiktokIconDiv.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" version="1.1" viewBox="0 0 72 72" width="50px" height="50px">
                    <defs>
                        <style>
                            .st0 {
                                fill: #fff;
                                fill-rule: evenodd;
                            }
                        </style>
                    </defs>
                    <path class="st0" d="M49.65,20.13v1.89h0v25.41c0,6.06-2.39,11.82-6.67,16.1-4.28,4.28-10.04,6.67-16.1,6.67s-11.82-2.38-16.1-6.67c-4.28-4.28-6.67-10.04-6.67-16.1s2.39-11.82,6.67-16.1c4.28-4.28,10.04-6.67,16.1-6.67h4.23v11.97h-4.23c-2.88,0-5.6,1.13-7.64,3.16-2.03,2.03-3.16,4.76-3.16,7.64s1.13,5.6,3.16,7.64c2.03,2.03,4.76,3.16,7.64,3.16s5.6-1.13,7.64-3.16c2.03-2.03,3.16-4.76,3.16-7.61V1.8h11.92l.6,1.11c1.86,3.44,4.36,6.7,7.46,9.11,2.4,1.86,5.12,3.17,8.12,3.7l2.12.37-2.28,11.54-2.04-.36c-2.43-.43-4.81-1.17-7.05-2.22-2.56-1.21-4.94-2.84-6.89-4.9h0Z"/>
                </svg>
            `;
        }
    }

    console.log('Social media icons replaced with black background, white fill versions');
}