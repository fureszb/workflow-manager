"""add subtasks

Revision ID: g6b3f9d20e54
Revises: d4e5f6a7b8c9
Create Date: 2026-02-12 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g6b3f9d20e54'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create process_type_subtasks table (templates)
    op.create_table('process_type_subtasks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('process_type_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), default=0, nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['process_type_id'], ['process_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create process_instance_subtasks table (actual subtasks)
    op.create_table('process_instance_subtasks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('process_instance_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status_id', sa.Integer(), nullable=True),
        sa.Column('order', sa.Integer(), default=0, nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['process_instance_id'], ['process_instances.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['process_type_subtasks.id'], ),
        sa.ForeignKeyConstraint(['status_id'], ['status_definitions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('process_instance_subtasks')
    op.drop_table('process_type_subtasks')
