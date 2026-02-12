"""add quick_guide to process_instance

Revision ID: f5a2e8c19d43
Revises: e8566a20f821
Create Date: 2026-02-09 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a2e8c19d43'
down_revision: Union[str, None] = 'e8566a20f821'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('process_instances', sa.Column('quick_guide', sa.Text(), nullable=True))
    op.add_column('process_instances', sa.Column('quick_guide_ai_draft', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('process_instances', 'quick_guide_ai_draft')
    op.drop_column('process_instances', 'quick_guide')
