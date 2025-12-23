/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState, useMemo } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	Flex,
	FlexItem,
	Icon,
	Modal,
} from '@wordpress/components';
import { desktop, tablet, mobile, seen, unseen } from '@wordpress/icons';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';
import { store as noticesStore } from '@wordpress/notices';
import { store as blocksStore } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { store as blockEditorStore } from '../../store';
import { BLOCK_VISIBILITY_VIEWPORTS } from './constants';
import { cleanEmptyObject } from '../../hooks/utils';
import './style.scss';

/**
 * Modal component for configuring block visibility across responsive breakpoints.
 *
 * Allows users to hide blocks on specific viewport sizes (mobile, tablet, desktop)
 * or hide them everywhere. When editing multiple blocks, checkboxes only show as
 * checked if ALL selected blocks share the same setting to avoid ambiguity.
 *
 * @param {Object}   props           Component props.
 * @param {string[]} props.clientIds Array of block client IDs to configure visibility for.
 * @param {Function} props.onClose   Callback function invoked when the modal is closed.
 * @return {JSX.Element} The modal component.
 */
export default function BlockVisibilityBreakpointsModal( {
	clientIds,
	onClose,
} ) {
	const { createSuccessNotice } = useDispatch( noticesStore );
	const listViewShortcut = useSelect( ( select ) => {
		return select( keyboardShortcutsStore ).getShortcutRepresentation(
			'core/editor/toggle-list-view'
		);
	}, [] );
	const { blocks, blockType } = useSelect(
		( select ) => {
			const _blocks =
				select( blockEditorStore ).getBlocksByClientId( clientIds );
			const firstBlock = _blocks?.[ 0 ];
			const _blockType =
				firstBlock && firstBlock.name
					? select( blocksStore ).getBlockType( firstBlock.name )
					: null;
			return {
				blocks: _blocks || [],
				blockType: _blockType,
			};
		},
		[ clientIds ]
	);
	const modalTitle = blockType?.title
		? sprintf(
				/* translators: %s: Block type title in lowercase (e.g., "image", "paragraph") */
				__( 'Hide %s' ),
				blockType.title.toLowerCase()
		  )
		: __( 'Hide block' );

	const handleSubmit = ( event ) => {
		event.preventDefault();
	};
	const [ viewportChecked, setViewportChecked ] = useState( {} );
	const handleViewportCheckboxChange = ( viewport, checked ) => {
		setViewportChecked( ( prevViewportChecked ) => ( {
			...prevViewportChecked,
			[ viewport ]: checked,
		} ) );
	};

	return (
		<Modal
			title={ modalTitle }
			onRequestClose={ onClose }
			overlayClassName="block-editor-block-visibility-modal"
			size="small"
		>
			<form onSubmit={ handleSubmit }>
				<fieldset className="block-editor-block-visibility-modal__description">
					<legend>
						{ __(
							'Select the viewport sizes for which you want to hide the block.'
						) }
					</legend>
					<ul className="block-editor-block-visibility-modal__options">
						{ Object.values( BLOCK_VISIBILITY_VIEWPORTS ).map(
							( { value, label } ) => (
								<li
									key={ value }
									className="block-editor-block-visibility-modal__checklist-item"
								>
									<CheckboxControl
										label={ label }
										checked={
											viewportChecked[ value ] ?? false
										}
										onChange={ ( checked ) =>
											handleViewportCheckboxChange(
												value,
												checked
											)
										}
									/>
								</li>
							)
						) }
					</ul>
				</fieldset>
			</form>
		</Modal>
	);
}
