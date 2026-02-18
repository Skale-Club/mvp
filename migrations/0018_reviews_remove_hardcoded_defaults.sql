BEGIN;

ALTER TABLE reviews_settings
  ALTER COLUMN section_title SET DEFAULT '',
  ALTER COLUMN section_subtitle SET DEFAULT '';

ALTER TABLE review_items
  ALTER COLUMN source_label SET DEFAULT '';

UPDATE reviews_settings
SET section_title = ''
WHERE section_title = 'What our clients say';

UPDATE reviews_settings
SET section_subtitle = ''
WHERE section_subtitle = 'See recent feedback from customers.';

COMMIT;
