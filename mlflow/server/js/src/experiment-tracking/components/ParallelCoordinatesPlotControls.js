import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../shared/building_blocks/Button';
import { TreeSelect } from 'antd';
import { injectIntl, FormattedMessage } from 'react-intl';
import { METRIC_SUMMARY_TYPES } from '../constants';
import { metricLabel } from '../utils/MetricUtils';

function keyToMetricObject(key) {
  if (key.endsWith('_latest')) {
    return {
      name: key.slice(0, key.length - 7),
      type: METRIC_SUMMARY_TYPES.LATEST,
    };
  } else if (key.endsWith('_min')) {
    return {
      name: key.slice(0, key.length - 4),
      type: METRIC_SUMMARY_TYPES.MIN,
    };
  } else {
    return {
      name: key.slice(0, key.length - 4),
      type: METRIC_SUMMARY_TYPES.MAX,
    };
  }
}

function metricObjectToKey(metric) {
  switch (metric.type) {
    case METRIC_SUMMARY_TYPES.MIN: {
      return metric.name + '_min';
    }
    case METRIC_SUMMARY_TYPES.MAX: {
      return metric.name + '_max';
    }
    case METRIC_SUMMARY_TYPES.LATEST:
    default: {
      return metric.name + '_latest';
    }
  }
}

class ParallelCoordinatesPlotControls extends React.Component {
  static propTypes = {
    // An array of available parameter keys to select
    paramKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    // An array of available metric keys to select
    metricKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedParamKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedMetrics: PropTypes.arrayOf(PropTypes.object).isRequired,
    handleParamsSelectChange: PropTypes.func.isRequired,
    handleMetricsSelectChange: PropTypes.func.isRequired,
    onClearAllSelect: PropTypes.func.isRequired,
    intl: PropTypes.shape({ formatMessage: PropTypes.func.isRequired }).isRequired,
  };

  static handleFilterChange = (text, option) =>
    option.props.title.toUpperCase().includes(text.toUpperCase());

  render() {
    const {
      paramKeys,
      metricKeys,
      selectedParamKeys,
      selectedMetrics,
      handleParamsSelectChange,
      handleMetricsSelectChange,
      onClearAllSelect,
      intl,
    } = this.props;
    return (
      <div className='plot-controls'>
        <div>
          <FormattedMessage
            defaultMessage='Parameters:'
            description='Label text for parameters in parallel coordinates plot in MLflow'
          />
        </div>
        <TreeSelect
          className='metrics-select'
          placeholder={
            <FormattedMessage
              defaultMessage='Please select parameters'
              description='Placeholder text for parameters in parallel coordinates plot in MLflow'
            />
          }
          value={selectedParamKeys}
          showCheckedStrategy={TreeSelect.SHOW_PARENT}
          treeCheckable
          treeData={paramKeys.map((k) => ({ title: k, value: k, label: k }))}
          onChange={handleParamsSelectChange}
          filterTreeNode={ParallelCoordinatesPlotControls.handleFilterChange}
        />
        <div style={{ marginTop: 20 }}>
          <FormattedMessage
            defaultMessage='Metrics:'
            description='Label text for metrics in parallel coordinates plot in MLflow'
          />
        </div>
        <TreeSelect
          className='metrics-select'
          placeholder={
            <FormattedMessage
              defaultMessage='Please select metrics'
              description='Placeholder text for metrics in parallel coordinates plot in MLflow'
            />
          }
          value={selectedMetrics.map(metricObjectToKey)}
          showCheckedStrategy={TreeSelect.SHOW_PARENT}
          treeCheckable
          treeData={this.getMetricTreeData(metricKeys, intl)}
          onChange={(selected) => handleMetricsSelectChange(selected.map(keyToMetricObject))}
          filterTreeNode={ParallelCoordinatesPlotControls.handleFilterChange}
        />
        <div style={{ marginTop: 20 }}>
          <Button dataTestId='clear-button' onClick={onClearAllSelect}>
            <FormattedMessage
              defaultMessage='Clear All'
              description='String for the clear button to clear any selected parameters and metrics'
            />
          </Button>
        </div>
      </div>
    );
  }

  getMetricTreeData(metricKeys, intl) {
    const metrics = metricKeys.map((k) => {
      return {
        key: k,
        latestKey: k + '_latest',
        minKey: k + '_min',
        maxKey: k + '_max',
        latestLabel: metricLabel(intl, k, METRIC_SUMMARY_TYPES.LATEST),
        minLabel: metricLabel(intl, k, METRIC_SUMMARY_TYPES.MIN),
        maxLabel: metricLabel(intl, k, METRIC_SUMMARY_TYPES.MAX),
      };
    });
    return metrics.map((metric) => ({
      title: metric.key,
      label: metric.key,
      value: metric.key,
      checkable: false,
      selectable: false,
      children: [
        {
          title: metric.latestLabel,
          label: metric.latestLabel,
          value: metric.latestKey,
        },
        {
          title: metric.minLabel,
          label: metric.minLabel,
          value: metric.minKey,
        },
        {
          title: metric.maxLabel,
          label: metric.maxLabel,
          value: metric.maxKey,
        },
      ],
    }));
  }
}

export default injectIntl(ParallelCoordinatesPlotControls);
