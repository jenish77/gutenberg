/**
 * WordPress dependencies
 */
const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

test.describe( 'List View Spotlight Mode', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.deleteAllBlocks();
	} );

	test.beforeEach( async ( { admin, page } ) => {
		// Enable the content-only pattern experiment
		await page.addInitScript( () => {
			window.__experimentalContentOnlyPatternInsertion = true;
		} );
		await admin.createNewPost();
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await requestUtils.deleteAllBlocks();
	} );

	test( 'should show disabled blocks in list view and constrain keyboard navigation', async ( {
		editor,
		page,
		pageUtils,
	} ) => {
		// Step 1: Create a Group block with two paragraphs inside
		await editor.insertBlock( { name: 'core/group' } );
		await editor.canvas
			.locator(
				'role=button[name="Group: Gather blocks in a container."i]'
			)
			.click();

		// Add first paragraph inside the group
		await editor.canvas.locator( 'role=button[name="Add block"i]' ).click();
		await page
			.getByRole( 'listbox', { name: 'Blocks' } )
			.getByRole( 'option', { name: 'Paragraph' } )
			.click();
		await page.keyboard.type( 'Pattern paragraph 1' );
		await page.keyboard.press( 'Enter' );

		// Add second paragraph inside the group
		await page.keyboard.type( 'Pattern paragraph 2' );

		// Step 2: Create an unsynced pattern from the Group block
		await editor.selectBlocks(
			editor.canvas.getByRole( 'document', {
				name: 'Block: Group',
			} )
		);

		// Create pattern from block options
		await editor.showBlockToolbar();
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Options' } )
			.click();
		await page.getByRole( 'menuitem', { name: 'Create pattern' } ).click();

		const createPatternDialog = page.getByRole( 'dialog', {
			name: 'add pattern',
		} );
		await createPatternDialog
			.getByRole( 'textbox', { name: 'Name' } )
			.fill( 'Test Pattern for Spotlight' );
		await createPatternDialog
			.getByRole( 'checkbox', { name: 'Synced' } )
			.setChecked( false ); // Make it unsynced

		await page.keyboard.press( 'Enter' );

		// Wait for the pattern creation to complete
		// Unsynced patterns insert as regular blocks, so we should see the Group
		// Wait for blocks to be in a stable state
		await expect
			.poll( async () => {
				const blocks = await editor.getBlocks();
				return blocks.some(
					( block ) =>
						block.name === 'core/group' &&
						block.innerBlocks?.length === 2
				);
			} )
			.toBe( true );

		// Step 3: Insert a block beneath the group
		await editor.insertBlock( { name: 'core/paragraph' } );
		await page.keyboard.type( 'Block beneath pattern' );

		// Step 4: Enter spotlight mode by selecting the Group block and clicking "Edit section"
		await editor.selectBlocks(
			editor.canvas.getByRole( 'document', {
				name: 'Block: Group',
			} )
		);

		// Click "Edit section" from the block options menu
		await editor.clickBlockOptionsMenuItem( 'Edit section' );

		// Wait for spotlight mode to be active
		// The pattern blocks should now be editable and other blocks should be faded
		// Wait for paragraphs inside the group to be visible
		await expect
			.poll( async () => {
				const paragraphs = await editor.canvas
					.getByRole( 'document', {
						name: 'Block: Paragraph',
					} )
					.count();
				return paragraphs >= 2;
			} )
			.toBe( true );

		// Step 5: Open the list view
		await pageUtils.pressKeys( 'access+o' );
		const listView = page.getByRole( 'treegrid', {
			name: 'Block navigation structure',
		} );
		await expect( listView ).toBeVisible();

		// Step 6: Verify the block beneath the pattern shows in list view
		// (should be visible but faded)
		// The Group block created from the pattern should show the pattern name
		const groupBlock = listView.getByRole( 'gridcell', {
			name: 'Test Pattern for Spotlight',
			exact: true,
		} );
		await expect( groupBlock ).toBeVisible();

		// Find paragraph blocks - the one outside the group should be after it
		// Get all paragraph cells and find the one that's not inside the group
		const paragraphBlocks = listView.getByRole( 'gridcell', {
			name: 'Paragraph',
			exact: true,
		} );
		// The last paragraph should be the one beneath the group
		const blockBeneathPattern = paragraphBlocks.last();
		await expect( blockBeneathPattern ).toBeVisible();

		// Verify it has the faded class by checking the parent row
		const fadedBlockRow = blockBeneathPattern.locator( '..' ); // Get parent row
		await expect( fadedBlockRow ).toHaveClass( /is-faded-in-spotlight/ );

		// Step 7: Test keyboard navigation is constrained to pattern blocks on canvas
		// Focus on the first paragraph inside the pattern (inside the Group)
		await editor.canvas
			.getByRole( 'document', {
				name: 'Block: Paragraph',
			} )
			.first()
			.click();

		// Try to navigate down - should move to next pattern block (Pattern paragraph 2)
		await page.keyboard.press( 'ArrowDown' );

		// Verify we're on Pattern paragraph 2 (the last paragraph in the pattern)
		// Check that the paragraph containing "Pattern paragraph 2" is focused
		const patternParagraph2 = editor.canvas
			.getByRole( 'document', {
				name: 'Block: Paragraph',
			} )
			.filter( { hasText: 'Pattern paragraph 2' } );
		await expect( patternParagraph2 ).toBeFocused();

		// Try to navigate down again - should stay on Pattern paragraph 2
		// (navigation should be prevented, so we remain on the last pattern paragraph)
		await page.keyboard.press( 'ArrowDown' );

		// Verify we're still on Pattern paragraph 2 and haven't navigated to the block beneath
		await expect( patternParagraph2 ).toBeFocused();

		// Also verify the block beneath pattern is NOT focused
		const blockBeneath = editor.canvas
			.getByRole( 'document', {
				name: 'Block: Paragraph',
			} )
			.filter( { hasText: 'Block beneath pattern' } );
		await expect( blockBeneath ).not.toBeFocused();
	} );

	// test( 'should exit spotlight mode when clicking faded block in list view', async ( {
	// 	editor,
	// 	page,
	// 	pageUtils,
	// } ) => {

	// } );

	// test( 'should exit spotlight mode when pressing Escape key', async ( {
	// 	editor,
	// 	page,
	// 	pageUtils,
	// } ) => {

	// } );
} );
