"""Add summary_type column to latest_metrics table

Revision ID: 8262b6ce8761
Revises: bd07f7e963c5
Create Date: 2022-03-15 16:26:22.315485

"""
from alembic import op
from sqlalchemy import orm, Column, Integer, Boolean, CheckConstraint

from mlflow.store.tracking.dbmodels.models import SqlLatestMetric


# revision identifiers, used by Alembic.
revision = "8262b6ce8761"
down_revision = "bd07f7e963c5"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    session = orm.Session(bind=bind)

    # Note: Because the check constraint on the is_nan column isn't named, it isn't automatically
    # retained when altering a table with SQLite, so must be added explicitly in the table args.
    # See https://alembic.sqlalchemy.org/en/latest/batch.html#including-check-constraints

    with op.batch_alter_table(
        SqlLatestMetric.__tablename__, table_args=[CheckConstraint("is_nan IN (0, 1)")]
    ) as batch_op:
        batch_op.add_column(Column("summary_type", Integer, nullable=False, server_default="0"))
        batch_op.drop_constraint(constraint_name="latest_metric_pk", type_="primary")
        batch_op.create_primary_key(
            constraint_name="latest_metric_pk",
            columns=["key", "run_uuid", "summary_type"],
        )

    # TODO: Compute min/max for existing data

    session.commit()


def downgrade():
    bind = op.get_bind()
    session = orm.Session(bind=bind)
    with op.batch_alter_table(
        SqlLatestMetric.__tablename__, table_args=[CheckConstraint("is_nan IN (0, 1)")]
    ) as batch_op:
        batch_op.drop_constraint(constraint_name="latest_metric_pk", type_="primary")
        batch_op.create_primary_key(
            constraint_name="latest_metric_pk",
            columns=["key", "run_uuid"],
        )
        batch_op.drop_column(SqlLatestMetric.__tablename__, "summary_type")
    session.commit()
