"""create_person_embeddings_table

Revision ID: 7f22f8c883e7
Revises: 698f3c8ebba2
Create Date: 2025-05-13 22:40:31.481582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f22f8c883e7'
down_revision = '698f3c8ebba2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('person_embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('photo_id', sa.Integer(), nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=True),
        sa.Column('photographer_id', sa.Integer(), nullable=True),
        sa.Column('bbox_x', sa.Float(), nullable=False),
        sa.Column('bbox_y', sa.Float(), nullable=False),
        sa.Column('bbox_w', sa.Float(), nullable=False),
        sa.Column('bbox_h', sa.Float(), nullable=False),
        sa.Column('faiss_id', sa.Integer(), nullable=False),
        sa.Column('clip_embedding_model_version', sa.String(), nullable=True),
        sa.Column('detection_model_version', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('processing_time_ms', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ),
        sa.ForeignKeyConstraint(['photographer_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['photo_id'], ['photos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_person_embeddings_event_id'), 'person_embeddings', ['event_id'], unique=False)
    op.create_index(op.f('ix_person_embeddings_faiss_id'), 'person_embeddings', ['faiss_id'], unique=True)
    op.create_index(op.f('ix_person_embeddings_id'), 'person_embeddings', ['id'], unique=False)
    op.create_index(op.f('ix_person_embeddings_photographer_id'), 'person_embeddings', ['photographer_id'], unique=False)
    op.create_index(op.f('ix_person_embeddings_photo_id'), 'person_embeddings', ['photo_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_person_embeddings_photo_id'), table_name='person_embeddings')
    op.drop_index(op.f('ix_person_embeddings_photographer_id'), table_name='person_embeddings')
    op.drop_index(op.f('ix_person_embeddings_id'), table_name='person_embeddings')
    op.drop_index(op.f('ix_person_embeddings_faiss_id'), table_name='person_embeddings')
    op.drop_index(op.f('ix_person_embeddings_event_id'), table_name='person_embeddings')
    op.drop_table('person_embeddings')
