import { Component } from 'react';
import PropTypes from 'prop-types';
import { Editor, EditorState, Modifier, CompositeDecorator } from 'draft-js';
import Chip from '../MDL/Chip';
import DraftOverlay from './DraftOverlay';
import './draft-input-typeahead.scss';

/* TODO:
  - Make sure typing too long does not break line
*/

// TODO: Look into replacing this search algorith with an npm module.

// TODO: If suggestions exist containing delimiter, still show them.. Yeah super fun.

const matchInput = (word, suggestions) => {
  return suggestions.filter(sugg => {
    return sugg.indexOf(word) === 0;
  });
};

const isCursorInsideWord = (text, cursorPos) => {
  return /\w/.test(text.charAt(cursorPos)) && cursorPos !== 0;
}

const getDelimiterRange = (text, target, startIndex) => {
  const rightText = text.substring(startIndex);
  const leftText = text.substring(-1, startIndex);

  let rightIndex = rightText.indexOf(target);
  const leftIndex = leftText.lastIndexOf(target);

  if (rightIndex !== 1) {
    rightIndex += startIndex;
  }

  return [leftIndex, rightIndex];
};

const getWorkingText = (cursorPos, currentText, delimiter) => {
  if (currentText.length > cursorPos) {
    const delimiterRange = getDelimiterRange(currentText, delimiter, cursorPos);
    return currentText.substring(delimiterRange[0], delimiterRange[1]).trim();
  }

  const delimiterIndex = currentText.lastIndexOf(delimiter);
  return currentText.substring(delimiterIndex + 1, cursorPos);
};

const findChipEntities = (contentBlock, callback, contentState) => {
  contentBlock.findEntityRanges(
     (character) => {
       const entityKey = character.getEntity();
       return (
         entityKey !== null &&
         contentState.getEntity(entityKey).getType() === 'VARIABLE_CHIP'
       );
     },
     callback
   );
};

const removeEntity = (targetEntityKey, blockKey, targetEditorState) => {
  let newState = targetEditorState;
  const currentContent = targetEditorState.getCurrentContent();
  const selectionState = targetEditorState.getSelection();
  const contentBlock = currentContent.getBlockForKey(blockKey);
  contentBlock.findEntityRanges(
     (character) => {
       const entityKey = character.getEntity();
       return (
         entityKey === targetEntityKey &&
         currentContent.getEntity(entityKey).getType() === 'VARIABLE_CHIP'
       );
     },
     (startOffset, endOffset) => {
       const removalSelection = selectionState.merge({
         anchorKey: blockKey,
         focusKey: blockKey,
         anchorOffset: startOffset,
         focusOffset: endOffset + 1 // JC - without "+ 1", removing chips would leave an extra space
       });

       const newContentState = Modifier.removeRange(currentContent, removalSelection, 'backward');
       newState = EditorState.push(targetEditorState, newContentState, 'apply-entity');
     }
   );
  return newState;
};


export default class DraftInputTypeAhead extends Component {
  constructor() {
    super();
    this._onChange = this._onChange.bind(this);
    this._checkShouldShowTypeAhead = this._checkShouldShowTypeAhead.bind(this);
    this._renderTypeAhead = this._renderTypeAhead.bind(this);
    this._changeHighlightPosition.bind(this);
    this._onUpArrow = this._onUpArrow.bind(this);
    this._onDownArrow = this._onDownArrow.bind(this);
    this._onMouseEnter = this._onMouseEnter.bind(this);
    this._handleInsert = this._handleInsert.bind(this);

    const VariableChip = (props) => {
     const { selectedSuggestion, blockKey } = props.contentState.getEntity(props.entityKey).getData();

     const delAction = (e) => {
       e.preventDefault();
       e.stopPropagation();
       const newState = removeEntity(props.entityKey, blockKey, this.state.editorState);
       this.setState({
         editorState: newState
       });
     };

     const varString = `<%- ${selectedSuggestion} -%>`;

      return (
        <Chip
          data-offset-key={props.offsetKey}
          className="draft-input-variable-chip"
          contentEditable="false"
          deleteAction={delAction}
          suppressContentEditableWarning
          deletable
        >
          {selectedSuggestion}
        </Chip>
      );
    };

    this.decorator = new CompositeDecorator([
      {
        strategy: findChipEntities,
        component: VariableChip,
      }
    ]);

    this.state = {
      editorState: EditorState.createEmpty(this.decorator),
      overlayVisible: false,
      highlightPosition: 0,
      suggestions: []
    };
  }

  _onMouseEnter(index) {
    this.setState({
      highlightPosition: index
    });
  }

  _onDownArrow(e) {
    e.preventDefault();
    this._changeHighlightPosition(1);
  }

  _onUpArrow(e) {
    e.preventDefault();
    this._changeHighlightPosition(-1);
  }

  _changeHighlightPosition(value) {
    const { suggestions } = this.state;

    let highlightPosition = this.state.highlightPosition + value;

    if (highlightPosition < 0) {
      highlightPosition = 0;
    } else if (highlightPosition > suggestions.length - 1) {
      highlightPosition = suggestions.length - 1;
    }

    this.setState({
      highlightPosition
    });
  }

  _handleInsert(index) {
    const { suggestions, highlightPosition, overlayVisible, editorState } = this.state;
    const { delimiter = ' ' } = this.props;

    const selected = index || highlightPosition;

    if (overlayVisible) {
      const selectedSuggestion = suggestions[selected];
      const currentContent = editorState.getCurrentContent();
      const currentSelection = editorState.getSelection();
      const blockKey = currentSelection.getAnchorKey();
      const cursorPos = currentSelection.getEndOffset();
      const currentBlock = currentContent.getBlockForKey(blockKey);
      const workingWord = getWorkingText(cursorPos, currentBlock.getText(), delimiter);

      const entity = currentContent.createEntity(
        'VARIABLE_CHIP',
        'IMMUTABLE',
        {
          selectedSuggestion,
          blockKey
        }
      );

      const entityKey = entity.getLastCreatedEntityKey();

      // Force select word
      const newSelectionState = currentSelection.merge({
        focusOffset: cursorPos - workingWord.length,
        isBackward: true
      });

      console.log('<< before CHIP', {
        anchorOffset: newSelectionState.getAnchorOffset(),
        focusOffset: newSelectionState.getFocusOffset(),
        isCollapsed: newSelectionState.isCollapsed(),
        isBackward: newSelectionState.getIsBackward()
      });

      const varString = `<%- ${selectedSuggestion} -%>`;

      const contentWithEntity = Modifier.replaceText(
        currentContent,
        newSelectionState,
        varString,
        null,
        entityKey
      );

      const editorStateWithChip = EditorState.push(
        editorState,
        contentWithEntity,
        'insert-emoji',
      );

      const currentChipContent = editorStateWithChip.getCurrentContent();
      const currentChipSelection = editorStateWithChip.getSelection();

      const collapsedChipSelection = currentChipSelection.merge({
        anchorOffset: currentChipSelection.getAnchorOffset(),
        focusOffset: currentChipSelection.getAnchorOffset()
      });

      const contentWithBlank = Modifier.insertText(
        contentWithEntity,
        collapsedChipSelection,
        ' ',
        null,
        null
      );

      const editorStateWithTrailingSpace = EditorState.push(
        editorStateWithChip,
        contentWithBlank,
        'insert-text',
      );

      console.log('<<< after CHIP & Space', {
        anchorOffset: collapsedChipSelection.getAnchorOffset(),
        focusOffset: collapsedChipSelection.getFocusOffset(),
        isCollapsed: collapsedChipSelection.isCollapsed(),
        isBackward: collapsedChipSelection.getIsBackward()
      });

      this.setState({
        editorState: editorStateWithTrailingSpace,
        overlayVisible: false
      });
    }
  }

  _checkShouldShowTypeAhead() {
    const { showTypAheadOnBlankWords = false, delimiter = ' ', suggestions } = this.props;
    const { editorState } = this.state;

    const currentSelection = editorState.getSelection();
    const blockKey = currentSelection.getAnchorKey();
    const currentContent = editorState.getCurrentContent();
    const currentBlock = currentContent.getBlockForKey(blockKey);
    const blockHasContent = currentBlock.getLength() > 0;

    if (showTypAheadOnBlankWords || blockHasContent) {
      const currentText = currentBlock.getText();
      const cursorPos = currentSelection.getEndOffset();
      const insideWord = isCursorInsideWord(currentText, cursorPos);
      const workingText = getWorkingText(cursorPos, currentText, delimiter);

      if (workingText.length || showTypAheadOnBlankWords) {
        const filteredInputs = matchInput(workingText, suggestions);
        this.setState({
          overlayVisible: Boolean(filteredInputs.length) && !insideWord,
          highlightPosition: 0,
          suggestions: filteredInputs
        });
      } else {
        this.setState({
          overlayVisible: false
        });
      }
    } else {
      this.setState({
        overlayVisible: false
      });
    }
  }

  _renderTypeAhead() {
    const { overlayVisible, suggestions } = this.state;

    const typeAheadOverlay = overlayVisible ? (
      <DraftOverlay
        onMouseEnter={this._onMouseEnter}
        onClick={this._handleInsert}
        highlightPosition={this.state.highlightPosition}
        suggestions={suggestions}
      />
    ) : null;

    return typeAheadOverlay;
  }

  _onChange(editorState) {
    this.setState({
      editorState
    }, this._checkShouldShowTypeAhead);
  }

  render() {
    const {
      onEnterPressed = () => {}
    } = this.props;

    const typeAheadOverlay = this._renderTypeAhead();

    return (
      <div className="dit-menu-container">
        {typeAheadOverlay}
        <Editor
          editorState={this.state.editorState}
          onUpArrow={this._onUpArrow}
          onDownArrow={this._onDownArrow}
          handleReturn={() => {
            onEnterPressed();
            this._handleInsert();
            return 'handled';
          }}
          onChange={this._onChange}
        />
      </div>
    );
  }
}

DraftInputTypeAhead.propTypes = {
  onEnterPressed: PropTypes.func,
  onChipInserted: PropTypes.func,
  validation: PropTypes.func,
  delimiter: PropTypes.string,
  showTypAheadOnBlankWords: PropTypes.bool,
  suggestions: PropTypes.array.isRequired
};
