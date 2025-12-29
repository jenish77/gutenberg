/**
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState, useMemo, useCallback } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	Flex,
	FlexItem,
	Icon,
	Modal,
} from '@wordpress/components';
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
 * Modal component for configuring block visibility across viewports.
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
export default function BlockVisibilityModal( { clientIds, onClose } ) {
	const { createSuccessNotice } = useDispatch( noticesStore );
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const [ viewportChecked, setViewportChecked ] = useState( {} );
	const [ hideEverywhere, setHideEverywhere ] = useState( false );

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

	const getDefaultViewportValues = useCallback( ( defaultValue = false ) => {
		return Object.entries( BLOCK_VISIBILITY_VIEWPORTS ).reduce(
			( acc, [ , { value } ] ) => {
				acc[ value ] = defaultValue;
				return acc;
			},
			{}
		);
	}, [] );

	const initialHideEverywhere = useMemo( () => {
		if ( blocks.length === 0 ) {
			return false;
		}

		return blocks.every(
			( block ) =>
				block && block.attributes?.metadata?.blockVisibility === false
		);
	}, [ blocks ] );

	const initialViewportValues = useMemo( () => {
		if ( blocks.length === 0 ) {
			return {};
		}

		if ( initialHideEverywhere ) {
			return getDefaultViewportValues( true );
		}

		const breakpoints = getDefaultViewportValues();

		// Check if all blocks have the same value for each breakpoint
		const allBlocksHaveMobile = blocks.every(
			( block ) =>
				block &&
				block.attributes?.metadata?.blockVisibility?.[
					BLOCK_VISIBILITY_VIEWPORTS.mobile.value
				] === false
		);
		const allBlocksHaveTablet = blocks.every(
			( block ) =>
				block &&
				block.attributes?.metadata?.blockVisibility?.[
					BLOCK_VISIBILITY_VIEWPORTS.tablet.value
				] === false
		);
		const allBlocksHaveDesktop = blocks.every(
			( block ) =>
				block &&
				block.attributes?.metadata?.blockVisibility?.[
					BLOCK_VISIBILITY_VIEWPORTS.desktop.value
				] === false
		);

		breakpoints[ BLOCK_VISIBILITY_VIEWPORTS.mobile.value ] =
			allBlocksHaveMobile;
		breakpoints[ BLOCK_VISIBILITY_VIEWPORTS.tablet.value ] =
			allBlocksHaveTablet;
		breakpoints[ BLOCK_VISIBILITY_VIEWPORTS.desktop.value ] =
			allBlocksHaveDesktop;

		return breakpoints;
	}, [ blocks, getDefaultViewportValues, initialHideEverywhere ] );

	useEffect( () => {
		setViewportChecked( initialViewportValues );
		setHideEverywhere( initialHideEverywhere );
	}, [ initialViewportValues, initialHideEverywhere ] );

	const handleViewportCheckboxChange = ( viewport, isChecked ) => {
		if ( viewport === 'all' ) {
			setHideEverywhere( isChecked );
			setViewportChecked( getDefaultViewportValues( isChecked ) );
		} else {
			const newViewportsChecked = {
				...viewportChecked,
				[ viewport ]: isChecked,
			};
			const allViewportsChecked = Object.values(
				newViewportsChecked
			).every( ( checked ) => checked === true );
			setViewportChecked( newViewportsChecked );
			setHideEverywhere( allViewportsChecked );
		}
	};
	const handleSubmit = ( event ) => {
		event.preventDefault();
		const newVisibility = hideEverywhere
			? false
			: Object.entries( BLOCK_VISIBILITY_VIEWPORTS ).reduce(
					( acc, [ , { value } ] ) => {
						if ( viewportChecked[ value ] ) {
							acc[ value ] = false;
						}
						return acc;
					},
					{}
			  );
		const attributesByClientId = Object.fromEntries(
			blocks
				?.filter( ( block ) => block && block.clientId )
				.map( ( { clientId, attributes } ) => [
					clientId,
					{
						metadata: cleanEmptyObject( {
							...attributes?.metadata,
							blockVisibility: newVisibility,
						} ),
					},
				] )
		);
		updateBlockAttributes( clientIds, attributesByClientId, {
			uniqueByBlock: true,
		} );

		if ( hideEverywhere ) {
			if ( blocks.length > 1 ) {
				createSuccessNotice(
					sprintf(
						// translators: %s: The shortcut key to access the List View.
						__(
							'Blocks hidden. You can access them via the List View (%s).'
						),
						listViewShortcut
					),
					{
						id: 'block-visibility-hidden',
						type: 'snackbar',
					}
				);
			} else {
				createSuccessNotice(
					sprintf(
						// translators: %s: The shortcut key to access the List View.
						__(
							'Block hidden. You can access it via the List View (%s).'
						),
						listViewShortcut
					),
					{
						id: 'block-visibility-hidden',
						type: 'snackbar',
					}
				);
			}
		} else {
			createSuccessNotice(
				sprintf(
					// translators: %s: The shortcut key to access the List View.
					__(
						'Block visibility settings saved. You can access it via the List View (%s).'
					),
					listViewShortcut
				),
				{
					id: 'block-visibility-breakpoints-saved',
					type: 'snackbar',
				}
			);
		}
		onClose();
	};

	let modalTitle =
		clientIds?.length > 1 ? __( 'Hide blocks' ) : __( 'Hide block' );
	if ( blockType?.title ) {
		modalTitle = sprintf(
			/* translators: %s: Block type title in lowercase (e.g., "image", "paragraph") */
			__( 'Hide %s' ),
			blockType.title.toLowerCase()
		);
	}

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
						<li className="block-editor-block-visibility-modal__options-item block-editor-block-visibility-modal__options-item--everywhere">
							<CheckboxControl
								className="block-editor-block-visibility-modal__options-checkbox--everywhere"
								label={ __( 'Hide everywhere' ) }
								checked={ hideEverywhere }
								onChange={ ( checked ) =>
									handleViewportCheckboxChange(
										'all',
										checked
									)
								}
							/>
							<ul className="block-editor-block-visibility-modal__sub-options">
								{ Object.entries(
									BLOCK_VISIBILITY_VIEWPORTS
								).map( ( [ , { label, icon, value } ] ) => (
									<li
										key={ value }
										className="block-editor-block-visibility-modal__options-item"
									>
										<CheckboxControl
											label={ label }
											checked={
												viewportChecked[ value ] ??
												false
											}
											onChange={ ( checked ) =>
												handleViewportCheckboxChange(
													value,
													checked
												)
											}
										/>
										<Icon
											icon={ icon }
											className={ clsx( {
												'block-editor-block-visibility-modal__options-icon--checked':
													viewportChecked[ value ],
											} ) }
										/>
									</li>
								) ) }
							</ul>
						</li>
					</ul>
					<p className="block-editor-block-visibility-modal__description">
						{ sprintf(
							// translators: %s: The shortcut key to access the List View.
							__(
								'Block will be hidden according to the selected breakpoints. It will be included in the published markup on the frontend. You can configure it again by selecting it in the List View (%s).'
							),
							listViewShortcut
						) }
					</p>
				</fieldset>
				<Flex
					className="block-editor-block-visibility-modal__actions"
					justify="flex-end"
					expanded={ false }
				>
					<FlexItem>
						<Button
							variant="tertiary"
							onClick={ onClose }
							__next40pxDefaultSize
						>
							{ __( 'Cancel' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							variant="primary"
							type="submit"
							__next40pxDefaultSize
						>
							{ __( 'Apply' ) }
						</Button>
					</FlexItem>
				</Flex>
			</form>
		</Modal>
	);
}
