// export const generatePreviewHTML = (widgetScript) => {
//     return `
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <title>Store Home Preview</title>
//         <meta charset="utf-8" />
//         <meta name="viewport" content="width=device-width, initial-scale=1" />
//         <style>
//           html, body {
//             margin: 0;
//             padding: 0;
//             height: 100%;
//             background: #f3f4f6;
//             font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
//           }

//           .home-page {
//             min-height: 100%;
//             display: flex;
//             flex-direction: column;
//           }

//           .home-header {
//             background: #111827;
//             color: white;
//             padding: 14px 32px;
//             display: flex;
//             align-items: center;
//             justify-content: space-between;
//           }
//           .home-logo {
//             font-weight: 700;
//             letter-spacing: 0.08em;
//             font-size: 14px;
//           }
//           .home-nav {
//             display: flex;
//             gap: 20px;
//             font-size: 14px;
//             opacity: 0.9;
//           }

//           .home-main {
//             flex: 1;
//             padding: 24px 32px 40px;
//             box-sizing: border-box;
//           }

//           .hero {
//             background: linear-gradient(135deg, #0f172a, #1e293b);
//             color: white;
//             border-radius: 16px;
//             padding: 32px 32px 28px;
//             display: grid;
//             grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
//             gap: 24px;
//             margin-bottom: 32px;
//           }
//           .hero-title {
//             font-size: 28px;
//             font-weight: 700;
//             margin-bottom: 8px;
//           }
//           .hero-subtitle {
//             font-size: 15px;
//             opacity: 0.9;
//             margin-bottom: 16px;
//           }
//           .hero-cta {
//             display: flex;
//             gap: 12px;
//           }
//           .hero-btn-primary {
//             padding: 10px 18px;
//             border-radius: 999px;
//             background: white;
//             color: #111827;
//             font-size: 14px;
//             border: none;
//           }
//           .hero-btn-secondary {
//             padding: 10px 18px;
//             border-radius: 999px;
//             border: 1px solid rgba(148,163,184,0.7);
//             background: transparent;
//             color: white;
//             font-size: 14px;
//           }
//           .hero-badge {
//             display: inline-flex;
//             align-items: center;
//             gap: 6px;
//             padding: 4px 10px;
//             border-radius: 999px;
//             background: rgba(15,23,42,0.8);
//             font-size: 11px;
//             margin-bottom: 10px;
//           }
//           .hero-media {
//             border-radius: 14px;
//             background: radial-gradient(circle at 0 0, #4ade80, #22c55e 20%, #0f172a 60%);
//             position: relative;
//             overflow: hidden;
//           }
//           .hero-media-placeholder {
//             position: absolute;
//             inset: 14px;
//             border-radius: 10px;
//             background: rgba(15,23,42,0.9);
//           }

//           .section {
//             margin-bottom: 28px;
//           }
//           .section-header {
//             display: flex;
//             justify-content: space-between;
//             align-items: baseline;
//             margin-bottom: 12px;
//           }
//           .section-title {
//             font-size: 18px;
//             font-weight: 600;
//             color: #111827;
//           }
//           .section-subtitle {
//             font-size: 13px;
//             color: #6b7280;
//           }

//           .collection-grid {
//             display: grid;
//             grid-template-columns: repeat(4, minmax(0, 1fr));
//             gap: 16px;
//           }
//           .collection-card {
//             background: white;
//             border-radius: 12px;
//             box-shadow: 0 1px 3px rgba(15,23,42,0.06);
//             overflow: hidden;
//           }
//           .collection-thumb {
//             height: 110px;
//             background: #e5e7eb;
//           }
//           .collection-body {
//             padding: 10px 12px 12px;
//           }
//           .collection-name {
//             font-size: 14px;
//             font-weight: 500;
//             margin-bottom: 2px;
//           }
//           .collection-meta {
//             font-size: 12px;
//             color: #6b7280;
//           }

//           /* Video widget section */
//           .widget-shell {
//             background: white;
//             border-radius: 16px;
//             padding: 16px 16px 18px;
//             box-shadow: 0 1px 3px rgba(15,23,42,0.08);
//           }
//           .widget-header-row {
//             display: flex;
//             justify-content: space-between;
//             align-items: center;
//             margin-bottom: 8px;
//           }
//           .widget-title {
//             font-size: 16px;
//             font-weight: 600;
//             color: #111827;
//           }
//           .widget-pill {
//             font-size: 11px;
//             padding: 4px 9px;
//             border-radius: 999px;
//             background: #eff6ff;
//             color: #1d4ed8;
//           }
//           .widget-caption {
//             font-size: 12px;
//             color: #6b7280;
//             margin-bottom: 8px;
//           }

//           #root {
//             width: 100%;
//             transform: scale(0.85);
//             transform-origin: top left;
//           }

//           .home-footer {
//             padding: 14px 32px 18px;
//             font-size: 12px;
//             color: #9ca3af;
//             border-top: 1px solid #e5e7eb;
//             background: white;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="home-page">
//           <header class="home-header">
//             <div class="home-logo">MY STORE</div>
//             <nav class="home-nav">
//               <span>Home</span>
//               <span>New arrivals</span>
//               <span>Collections</span>
//               <span>Sale</span>
//             </nav>
//           </header>

//           <main class="home-main">
//             <!-- HERO -->
//             <section class="hero">
//               <div>
//                 <div class="hero-badge">
//                   <span>●</span>
//                   <span>Preview only – not your real theme</span>
//                 </div>
//                 <div class="hero-title">Bring your products to life with video.</div>
//                 <div class="hero-subtitle">
//                   See how your widget looks on a typical store home page before publishing to your theme.
//                 </div>
//                 <div class="hero-cta">
//                   <button class="hero-btn-primary">Shop now</button>
//                   <button class="hero-btn-secondary">View collection</button>
//                 </div>
//               </div>
//               <div class="hero-media">
//                 <div class="hero-media-placeholder"></div>
//               </div>
//             </section>

//             <!-- YOUR WIDGET ON HOME PAGE -->
//             <section class="section">
//               <div class="widget-shell">
//                 <div class="widget-header-row">
//                   <span class="widget-pill">Widget preview</span>
//                 </div>

//                 <div id="root"></div>
//               </div>
//             </section>

//             <!-- FEATURED COLLECTIONS -->
//             <section class="section">
//               <div class="section-header">
//                 <div class="section-title">Featured collections</div>
//                 <div class="section-subtitle">Example layout only – not linked to your store data.</div>
//               </div>
//               <div class="collection-grid">
//                 <div class="collection-card">
//                   <div class="collection-thumb"></div>
//                   <div class="collection-body">
//                     <div class="collection-name">Summer essentials</div>
//                     <div class="collection-meta">12 products</div>
//                   </div>
//                 </div>
//                 <div class="collection-card">
//                   <div class="collection-thumb"></div>
//                   <div class="collection-body">
//                     <div class="collection-name">Best sellers</div>
//                     <div class="collection-meta">8 products</div>
//                   </div>
//                 </div>
//                 <div class="collection-card">
//                   <div class="collection-thumb"></div>
//                   <div class="collection-body">
//                     <div class="collection-name">New in</div>
//                     <div class="collection-meta">6 products</div>
//                   </div>
//                 </div>
//                 <div class="collection-card">
//                   <div class="collection-thumb"></div>
//                   <div class="collection-body">
//                     <div class="collection-name">Editor’s picks</div>
//                     <div class="collection-meta">10 products</div>
//                   </div>
//                 </div>
//               </div>
//             </section>


//           </main>

//           <footer class="home-footer">
//             Store layout is for preview only and does not reflect your actual Shopify theme.
//           </footer>
//         </div>

//         <script>
//           ${widgetScript}
//           (function () {
//             function sendReady() {
//               if (window.parent) {
//                 window.parent.postMessage({ type: "video-cart-preview-ready" }, "*");
//               }
//             }

//             function handleMessage(event) {
//               if (!event.data || event.data.type !== "video-cart-preview-update") return;
//               var payload = event.data.payload;
//               var mountEl = document.getElementById("root");
//               if (!mountEl || !window.__video_cart_preview__) return;
//               window.__video_cart_preview__.renderPreviewWidget(mountEl, payload);
//             }

//             window.addEventListener("message", handleMessage);
//             if (document.readyState === "complete") {
//               sendReady();
//             } else {
//               window.addEventListener("load", sendReady);
//             }
//           })();
//         </script>
//       </body>
//     </html>
//   `;
// };


export const generatePreviewHTML = (widgetScript) => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Store Home Preview</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            background: #f3f4f6;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }

          .home-page {
            min-height: 100%;
            display: flex;
            flex-direction: column;
          }

          .home-header {
            background: #111827;
            color: white;
            padding: 14px 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .home-logo {
            font-weight: 700;
            letter-spacing: 0.08em;
            font-size: 14px;
          }
          .home-nav {
            display: flex;
            gap: 20px;
            font-size: 14px;
            opacity: 0.9;
          }

          .home-main {
            flex: 1;
            padding: 24px 32px 40px;
            box-sizing: border-box;
          }

          .hero {
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: white;
            border-radius: 16px;
            padding: 32px 32px 28px;
            display: grid;
            grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
            gap: 24px;
            margin-bottom: 32px;
          }
          .hero-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .hero-subtitle {
            font-size: 15px;
            opacity: 0.9;
            margin-bottom: 16px;
          }
          .hero-cta {
            display: flex;
            gap: 12px;
          }
          .hero-btn-primary {
            padding: 10px 18px;
            border-radius: 999px;
            background: white;
            color: #111827;
            font-size: 14px;
            border: none;
          }
          .hero-btn-secondary {
            padding: 10px 18px;
            border-radius: 999px;
            border: 1px solid rgba(148,163,184,0.7);
            background: transparent;
            color: white;
            font-size: 14px;
          }
          .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(15,23,42,0.8);
            font-size: 11px;
            margin-bottom: 10px;
          }
          .hero-media {
            border-radius: 14px;
            background: radial-gradient(circle at 0 0, #4ade80, #22c55e 20%, #0f172a 60%);
            position: relative;
            overflow: hidden;
          }
          .hero-media-placeholder {
            position: absolute;
            inset: 14px;
            border-radius: 10px;
            background: rgba(15,23,42,0.9);
          }

          .section {
            margin-bottom: 28px;
          }
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 12px;
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
          }
          .section-subtitle {
            font-size: 13px;
            color: #6b7280;
          }

          .collection-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
          }
          .collection-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(15,23,42,0.06);
            overflow: hidden;
          }
          .collection-thumb {
            height: 110px;
            background: #e5e7eb;
          }
          .collection-body {
            padding: 10px 12px 12px;
          }
          .collection-name {
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 2px;
          }
          .collection-meta {
            font-size: 12px;
            color: #6b7280;
          }

          /* Widget section – your carousel/stories/grid mount here */
          .widget-shell {
            background: white;
            border-radius: 16px;
            padding: 16px 16px 18px;
            box-shadow: 0 1px 3px rgba(15,23,42,0.08);
          }
          .widget-header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .widget-title {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }
          .widget-pill {
            font-size: 11px;
            padding: 4px 9px;
            border-radius: 999px;
            background: #eff6ff;
            color: #1d4ed8;
          }
          .widget-caption {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          /* IMPORTANT: no transform here */
          #root {
            width: 100%;
          }

          .home-footer {
            padding: 14px 32px 18px;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #e5e7eb;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="home-page">
          <header class="home-header">
            <div class="home-logo">MY STORE</div>
            <nav class="home-nav">
              <span>Home</span>
              <span>New arrivals</span>
              <span>Collections</span>
              <span>Sale</span>
            </nav>
          </header>

          <main class="home-main">
            <!-- HERO -->
            <section class="hero">
              <div>
                <div class="hero-badge">
                  <span>●</span>
                  <span>Preview only – not your real theme</span>
                </div>
                <div class="hero-title">Bring your products to life with video.</div>
                <div class="hero-subtitle">
                  See how your widget looks on a typical store home page before publishing to your theme.
                </div>
                <div class="hero-cta">
                  <button class="hero-btn-primary">Shop now</button>
                  <button class="hero-btn-secondary">View collection</button>
                </div>
              </div>
              <div class="hero-media">
                <div class="hero-media-placeholder"></div>
              </div>
            </section>

            <!-- WIDGET SECTION -->
            <section class="section">
              <div class="widget-shell">
                <div class="widget-header-row">
                  <span class="widget-pill">Widget preview</span>
                </div>
                <div id="root"></div>
              </div>
            </section>

            <!-- FEATURED COLLECTIONS -->
            <section class="section">
              <div class="section-header">
                <div class="section-title">Featured collections</div>
                <div class="section-subtitle">Example layout only – not linked to your store data.</div>
              </div>
              <div class="collection-grid">
                <div class="collection-card">
                  <div class="collection-thumb"></div>
                  <div class="collection-body">
                    <div class="collection-name">Summer essentials</div>
                    <div class="collection-meta">12 products</div>
                  </div>
                </div>
                <div class="collection-card">
                  <div class="collection-thumb"></div>
                  <div class="collection-body">
                    <div class="collection-name">Best sellers</div>
                    <div class="collection-meta">8 products</div>
                  </div>
                </div>
                <div class="collection-card">
                  <div class="collection-thumb"></div>
                  <div class="collection-body">
                    <div class="collection-name">New in</div>
                    <div class="collection-meta">6 products</div>
                  </div>
                </div>
                <div class="collection-card">
                  <div class="collection-thumb"></div>
                  <div class="collection-body">
                    <div class="collection-name">Editor’s picks</div>
                    <div class="collection-meta">10 products</div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer class="home-footer">
            Store layout is for preview only and does not reflect your actual Shopify theme.
          </footer>
        </div>

        <script>
          ${widgetScript}
          (function () {
            function sendReady() {
              if (window.parent) {
                window.parent.postMessage({ type: "video-cart-preview-ready" }, "*");
              }
            }

            function handleMessage(event) {
              if (!event.data || event.data.type !== "video-cart-preview-update") return;
              var payload = event.data.payload;
              var mountEl = document.getElementById("root");
              if (!mountEl || !window.__video_cart_preview__) return;
              window.__video_cart_preview__.renderPreviewWidget(mountEl, payload);
            }

            window.addEventListener("message", handleMessage);
            if (document.readyState === "complete") {
              sendReady();
            } else {
              window.addEventListener("load", sendReady);
            }
          })();
        </script>
      </body>
    </html>
  `;
};