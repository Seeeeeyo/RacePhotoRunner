"""Add cover_image_path to events table

Revision ID: 001_add_cover_image_path
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_cover_image_path'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add cover_image_path column to events table
    op.add_column('events', sa.Column('cover_image_path', sa.String(), nullable=True))


def downgrade():
    # Remove cover_image_path column from events table
    op.drop_column('events', 'cover_image_path') 