import React, {Component} from 'react';
import classNames from 'classnames';
import upgradeElement from '../upgrader';

class Chip extends Component {
  render() {
    const {
      children,
      deletable = false,
      contact = false,
      Component = 'span',
      deleteAction = () => {},
      ...rest
    } = this.props;

    const classes = classNames('mdl-chip', {
      'mdl-chip--contact': contact,
    }, this.props.className);

    const contactDiv = contact ? (
      <span className="mdl-chip__contact mdl-color--teal mdl-color-text--white">
        {contact}
      </span>
    ) : null

    const deleteButton = deletable ? (
      <button onClick={deleteAction} className="mdl-chip__action">x</button>
    ) : null;

    return (
      <Component {...rest} className={classes}>
        {contactDiv}
        <span className="mdl-chip__text">{children}</span>
        {deleteButton}
      </Component>
    );
  }
}

export default upgradeElement(Chip);
