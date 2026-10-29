/* eslint-disable react/prop-types -- widget contract: feed, videos, settings, onEvent */
import { ClassicCarousel } from './templates/Default/ClassicCarousel';
import { SpotlightCarousel } from './templates/Spotlight/SpotlightCarousel';
import { ShowcaseCarousel } from './templates/Showcase/ShowcaseCarousel';

const TEMPLATES = {
  default: ClassicCarousel,
  spotlight: SpotlightCarousel,
  showcase: ShowcaseCarousel,
};

export function VideoCarousel(props) {
  const template = props.settings?.design?.template
    || props.feed?.settings?.design?.template
    || 'default';

  const Component = TEMPLATES[template] || TEMPLATES.default;
  return <Component {...props} />;
}