/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { ClassicCarousel } from './templates/Default/ClassicCarousel';
import { SpotlightCarousel } from './templates/Spotlight/SpotlightCarousel';

const TEMPLATES = {
  default: ClassicCarousel,
  spotlight: SpotlightCarousel,
};

export function VideoCarousel(props) {
  const template = props.settings?.design?.template
    || props.feed?.settings?.design?.template
    || 'default';

  const Component = TEMPLATES[template] || TEMPLATES.default;
  return <Component {...props} />;
}