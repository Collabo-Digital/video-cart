import { InputBox } from './components/InputBox';
import { registerWidget } from './core/registry';
import { initWidgets } from './runtime';

// Register the InputBox widget
registerWidget({
  type: 'input-box',
  component: InputBox,
});

// Initialize from global config
function init() {
  // const config = window.__video_cart_config__;
  let config = {
    isActive : true,
    shop:'',
    type:"input-box"
  }

  window.__video_cart_config__ = config

  console.log(' ⚡️Initializing widgets⚡️', config);
  
  if (config?.isActive) {
    initWidgets(config);
  } else {
    console.warn('No widget config found');
  }
}

// Auto-start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

