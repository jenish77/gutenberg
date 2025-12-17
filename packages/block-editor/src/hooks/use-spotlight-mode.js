/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { store as blockEditorStore } from '../store';
import { unlock } from '../lock-unlock';

/**
 * Custom hook to determine if spotlight mode is active and whether a specific block
 * should be visually faded and interaction-disabled in the List View.
 *
 * Spotlight mode is activated when editing a content-only pattern section (unsynced patterns).
 * During this mode:
 * - Blocks outside the edited section are visually faded (opacity: 0.2)
 * - Faded blocks are non-interactive (aria-disabled, hover disabled, click disabled)
 * - Keyboard navigation is constrained to the edited section
 * - Blocks remain visible for context, unlike the previous approach which hid them
 *
 * This hook consolidates spotlight mode detection logic that was previously duplicated
 * across multiple components.
 *
 * @param {string} clientId The block client ID to check.
 *
 * @return {Object} Object containing spotlight mode state:
 *                  - isSpotlightActive {boolean}: Whether spotlight mode is currently active (any section being edited).
 *                  - shouldFade {boolean}: Whether this specific block should be faded and disabled.
 *                  - editedSection {string|null}: The client ID of the section being edited, or null if none.
 *                  - isWithinEditedSection {boolean}: Whether this block is within the edited section.
 *
 * @example
 * // In a List View block component
 * const { shouldFade, isWithinEditedSection } = useSpotlightMode( clientId );
 *
 * // Apply fading class
 * const className = clsx( {
 *   'is-faded-in-spotlight': shouldFade
 * } );
 *
 * // Disable interactions for faded blocks
 * const handleClick = ( event ) => {
 *   if ( shouldFade ) {
 *     event.preventDefault();
 *     return;
 *   }
 *   // ... normal click handling
 * };
 */
export function useSpotlightMode( clientId ) {
	return useSelect(
		( select ) => {
			// Feature flag check - if not enabled, spotlight mode is never active
			if ( ! window?.__experimentalContentOnlyPatternInsertion ) {
				return {
					isSpotlightActive: false,
					shouldFade: false,
					editedSection: null,
					isWithinEditedSection: false,
				};
			}

			const {
				getEditedContentOnlySection,
				isWithinEditedContentOnlySection,
			} = unlock( select( blockEditorStore ) );

			const editedSection = getEditedContentOnlySection();
			const isWithinEditedSection = editedSection
				? isWithinEditedContentOnlySection( clientId )
				: false;

			return {
				isSpotlightActive: !! editedSection,
				shouldFade: !! editedSection && ! isWithinEditedSection,
				editedSection,
				isWithinEditedSection,
			};
		},
		[ clientId ]
	);
}
