/* eslint-disable react/prop-types -- shared row used by carousel templates */
import { createEffect, createMemo, For, Show } from 'solid-js';
import { productsForVideo } from '../../../utils/widgetHelpers';
import './productNavigator.css';

/**
 * One item per distinct first-tagged product, in first-seen order. Videos
 * without products get no item. `videoIndexes` keeps every video tagged with
 * the product so repeated clicks on one item step through them.
 */
function buildItems(videos) {
  const itemsByKey = new Map();

  (videos ?? []).forEach((video, index) => {
    const product = productsForVideo(video)[0];
    if (!product) return;

    const key = product.id ?? product.handle;
    const item = itemsByKey.get(key);
    if (item) {
      item.videoIndexes.push(index);
    } else {
      itemsByKey.set(key, { key, product, videoIndexes: [index] });
    }
  });

  return [...itemsByKey.values()];
}

export function ProductNavigator({ videos, activeIndex, onSelect }) {
  let stripElement;

  const items = createMemo(() => buildItems(videos));
  const activeItem = () => items().find((item) => item.videoIndexes.includes(activeIndex()));

  const handleItemClick = (item) => {
    const position = item.videoIndexes.indexOf(activeIndex());
    // Not the active item: go to its first video. Active already: step to the next video with it.
    const nextPosition = position < 0 ? 0 : (position + 1) % item.videoIndexes.length;
    onSelect(item.videoIndexes[nextPosition]);
  };

  // Keep the active item in view by scrolling the strip only. `scrollIntoView`
  // would also scroll the shopper's page whenever Auto Loop moves the centre.
  createEffect(() => {
    const item = activeItem();
    if (!item || !stripElement) return;

    const itemElement = stripElement.querySelector(`[data-item-key="${item.key}"]`);
    if (!itemElement) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    stripElement.scrollTo({
      left: itemElement.offsetLeft - (stripElement.clientWidth - itemElement.offsetWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  });

  return (
    <Show when={items().length > 0}>
      <nav className="vd-product-navigator" aria-label="Product navigator">
        <div className="vd-product-navigator-strip" ref={stripElement}>
          <For each={items()}>
            {(item) => (
              <button
                type="button"
                className={`vd-product-navigator-item${activeItem()?.key === item.key ? ' is-active' : ''}`}
                data-item-key={item.key}
                aria-pressed={activeItem()?.key === item.key}
                title={item.product.title}
                onClick={() => handleItemClick(item)}
              >
                <span className="vd-product-navigator-media">
                  <Show when={item.product.image}>
                    <img src={item.product.image} alt="" loading="lazy" draggable={false} />
                  </Show>
                </span>
                <span className="vd-product-navigator-name">{item.product.title}</span>
              </button>
            )}
          </For>
        </div>
      </nav>
    </Show>
  );
}
