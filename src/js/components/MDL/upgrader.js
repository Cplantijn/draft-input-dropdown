import { Children, Component, PropTypes } from 'react';
import { findDOMNode } from 'react-dom';

export default function upgradeElement(Element) {
  return class UpgradeElement extends Element {
    constructor (props) {
      super(props);
      this.upgradeElements = this.upgradeElements.bind(this);
    }

    upgradeElements() {
      if (this.props.recursive) {
        window.componentHandler.upgradeElements(findDOMNode(this));
      } else {
        window.componentHandler.upgradeElement(findDOMNode(this));
      }
    }

    componentDidMount() {
      this.upgradeElements();
    }

    componentWillUnmount() {
      window.componentHandler.downgradeElements(findDOMNode(this));
    }

    render() {
      return super.render();
    }
  }
}
