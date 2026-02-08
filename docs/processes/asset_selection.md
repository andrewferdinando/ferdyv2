# Asset Selection & Rotation

## TL;DR (for AI tools)

- Assets live in a central `assets` table with tags.
- When a user creates or edits a Category (subcategory), they can:
  - Upload new assets.
  - Choose existing assets.
- Those assets are automatically **tagged** with the subcategory’s name (and/or ID).
- When generating drafts via the draft generator, Ferdy calls:

  ```sql
  rpc_pick_asset_for_rule(schedule_rule_id)
This function:

Tries to pick an asset tagged for that subcategory.

Uses a round-robin rotation per schedule rule (using image_cursor on schedule_rules).

Falls back to any brand-level asset if no subcategory-specific asset exists.

The picked asset ID is written into:

drafts.asset_ids (usually as a single-element array).

post_jobs inherit the same assets via the draft.

1. Where asset selection happens
Asset selection is tightly coupled to draft generation:

rpc_framework_targets(p_brand_id) generates future posting slots.

The draft generator (generateDraftsForBrand) loops through those slots.

For each slot (per schedule_rule_id), it calls:

sql
Copy code
SELECT rpc_pick_asset_for_rule(v_target.schedule_rule_id);
The returned asset_id is stored on the draft:

sql
Copy code
asset_ids = CASE WHEN v_target.asset_id IS NOT NULL 
                 THEN ARRAY[v_target.asset_id] 
                 ELSE ARRAY[]::uuid[] 
            END
So every framework-based draft starts with one chosen asset based on its schedule rule / subcategory.

2. Tagging model (UI behaviour)
When a user creates or edits a Category (Images section — Step 4 in create mode, Images accordion section in edit mode):

They can Upload new content or Use existing content.

Behind the scenes:

If the asset is new, it is inserted into the assets table (Supabase storage + metadata).

Whether new or existing, a record is inserted into asset_tags to associate the asset with:

A tag whose name = subcategory.name and kind = 'subcategory'.

The effect:

Every asset that “belongs” to a subcategory can be found by filtering for the tag representing that subcategory.

This is what rpc_pick_asset_for_rule() uses to find relevant images.

3. rpc_pick_asset_for_rule behaviour (conceptual)
The SQL function (stored in Supabase) implements the selection logic.

Conceptually, it does:

Find the schedule rule

SELECT * FROM schedule_rules WHERE id = schedule_rule_id;

Get:

brand_id

subcategory_id

current image_cursor

image strategy (image_strategy)

rotation strategy (image_rotation_strategy)

Find candidate assets

If image_strategy = 'by_subcategory_tag':

Select all assets tagged with the subcategory tag for subcategory_id.

If no tagged assets exist:

Fall back to all brand assets (e.g. any asset with brand_id).

Rotate (round-robin)

If image_rotation_strategy = 'round_robin':

Sort candidate assets by some stable field (e.g. created_at or asset ID).

Use image_cursor as index into the ordered list.

Increment image_cursor (wrap around at end).

Update schedule_rules.image_cursor accordingly.

Return asset

Return the chosen asset_id (or NULL if truly nothing exists).

This guarantees:

Posts for a given schedule rule cycle through available assets for that subcategory.

No single image is overused while others are ignored.

Brand-level fallback means the system still works if the user forgets to attach images to a category.

4. How this ties into the UI
On the Schedule / Drafts screens, the user sees the asset chosen by this logic.

They can manually override:

Change the asset to a different one.

Add additional assets (carousel-style).

Manual changes update drafts.asset_ids and will not affect the underlying image_cursor.

So the rotation is a default suggestion, not a hard rule.

5. Future extensions
Potential directions (documented here to guide future work):

Multiple assets per post by default (carousels).

Different image strategies:

by_brand_tag (brand-wide themes).

by_persona (if persona tagging is added).

random (no round-robin).

Per-channel asset preferences:

e.g. vertical vs square ratio for stories vs feed.

Whenever you change rpc_pick_asset_for_rule or the tagging model, update this document so it remains the source of truth.

Mermaid:
flowchart TD
    subgraph Setup
        WIZ[Category Wizard Step 4] --> ASSETS[(assets)]
        WIZ --> TAGS[(tags\nkind='subcategory')]
        WIZ --> AT[(asset_tags\nasset_id + tag_id)]
    end

    SR[(schedule_rules\nimage_strategy,\nimage_rotation_strategy,\nimage_cursor,\nsubcategory_id)] --> PICK[rpc_pick_asset_for_rule(schedule_rule_id)]
    ASSETS --> PICK
    TAGS --> PICK
    AT --> PICK

    PICK --> ASSET[Chosen asset_id or NULL]
    ASSET --> GEN[Draft Generator\n(generateDraftsForBrand)]
    GEN --> DRAFTS[(drafts.asset_ids)]

    DRAFTS --> UI[Drafts/Schedule UI\nuser can override assets]
