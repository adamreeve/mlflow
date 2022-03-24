import { METRIC_SUMMARY_TYPES } from '../constants';

export function metricLabel(intl, name, metricType) {
  switch (metricType) {
    case METRIC_SUMMARY_TYPES.MIN: {
      return intl.formatMessage(
        {
          defaultMessage: 'Min {metricName}',
          description: 'Format label for the minimum value of a metric',
        },
        {
          metricName: name,
        },
      );
    }
    case METRIC_SUMMARY_TYPES.MAX: {
      return intl.formatMessage(
        {
          defaultMessage: 'Max {metricName}',
          description: 'Format label for the maximum value of a metric',
        },
        {
          metricName: name,
        },
      );
    }
    case METRIC_SUMMARY_TYPES.LATEST:
    default: {
      return intl.formatMessage(
        {
          defaultMessage: 'Latest {metricName}',
          description: 'Format label for latest value of a metric',
        },
        {
          metricName: name,
        },
      );
    }
  }
}
