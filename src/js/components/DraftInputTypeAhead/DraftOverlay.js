import { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import $ from 'jquery';

export default class DraftOverlay extends Component {
  constructor() {
    super();
    this._renderSuggestions = this._renderSuggestions.bind(this);
  }

  // TODO: OnMouseEnter fights this sometimes and you get some weird stuff if the mouse is hovering while you're doing things.
  componentDidUpdate() {
    const $menu = $('.dit-menu');
    const $item = $('.dit-menu .highlighted');

    const menuScrollPos = $menu.scrollTop();
    const itemTop = $item.position().top;
    const itemHeight = $item.outerHeight();
    const menuHeight = $menu.outerHeight();
    const itemBottomEdge = itemTop + itemHeight;

    if (itemBottomEdge + menuScrollPos >= menuHeight + menuScrollPos) {
      $menu.scrollTop((itemBottomEdge - menuHeight) + menuScrollPos);
    } else if (itemTop < 0) {
      $menu.scrollTop(menuScrollPos + itemTop);
    }
  }

  _renderSuggestions() {
    const {
      suggestions,
      onMouseEnter,
      highlightPosition,
      onClick,
    } = this.props;

    return suggestions.map((sugg, index) => {

      const itemClass = classnames({
        highlighted: index === highlightPosition
      }, 'dit-menuitem');

      return (
        <li
          key={index}
          className={itemClass}
          onClick={onClick.bind(this, index)}
          onMouseEnter={onMouseEnter.bind(this, index)}
        >
          {sugg}
        </li>
      );
    });
  }

  render() {
    const suggestions = this._renderSuggestions();
    return (
      <div className="dit-menu-overlay">
        <ul className="dit-menu">
          {suggestions}
        </ul>
      </div>
    );
  }
}

DraftOverlay.propTypes = {
  suggestions: PropTypes.array
};
