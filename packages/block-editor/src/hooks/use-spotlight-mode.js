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
 * Hook to determine if spotlight mode is active and whether a specific block should be faded.
 * Spotlight mode is activated when editing a content-only pattern section, and blocks outside
 * the edited section are visually faded but remain visible in the List View.
 *
 * @param {string} clientId The block client ID to check.
 *
 * @return {Object} Object containing spotlight mode state:
 *                  - {boolean} isSpotlightActive: Whether spotlight mode is currently active.
 *                  - {boolean} shouldFade: Whether this specific block should be faded.
 *                  - {string|null} editedSection: The client ID of the section being edited, or null.
 *                  - {boolean} isWithinEditedSection: Whether this block is within the edited section.
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
