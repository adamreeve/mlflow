import React from 'react';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import PropTypes from 'prop-types';
import ParallelCoordinatesPlotView, { Axis, AXIS_TYPE } from './ParallelCoordinatesPlotView';
import ParallelCoordinatesPlotControls from './ParallelCoordinatesPlotControls';
import { getMetricHistoryApi } from '../actions';
import {
  getAllParamKeysByRunUuids,
  getAllMetricKeysByRunUuids,
  getSharedMetricKeysByRunUuids,
} from '../reducers/Reducers';
import { getMinMetrics } from '../reducers/MetricReducer';
import _ from 'lodash';
import { Empty } from 'antd';
import { METRIC_SUMMARY_TYPES } from '../constants';
import { metricLabel } from '../utils/MetricUtils';

import './ParallelCoordinatesPlotPanel.css';

export class ParallelCoordinatesPlotPanel extends React.Component {
  static propTypes = {
    runUuids: PropTypes.arrayOf(PropTypes.string).isRequired,
    // An array of all parameter keys across all runs
    allParamKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    // An array of all metric keys across all runs
    allMetricKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    // An array of metric keys for which all runs have values
    sharedMetricKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    // A subset of allParamKeys where the values, potentially undefined,
    // of the parameters differ between runs
    diffParamKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
    minMetricsByRun: PropTypes.object.isRequired,
    getMetricHistoryApi: PropTypes.func.isRequired,
    intl: PropTypes.shape({ formatMessage: PropTypes.func.isRequired }).isRequired,
  };

  state = {
    // Default to select differing parameters. Sort alphabetically (to match
    // highlighted params in param table), then cap at first 3
    selectedParamKeys: this.props.diffParamKeys.sort().slice(0, 3),
    // Default to select the first metric key.
    // Note that there will be no color scaling if no metric is selected.
    selectedMetrics: ParallelCoordinatesPlotPanel.asLatestMetricValues(
      this.props.sharedMetricKeys.slice(0, 1),
    ),
  };

  handleParamsSelectChange = (paramValues) => {
    this.setState({ selectedParamKeys: paramValues });
  };

  handleMetricsSelectChange = (metricValues) => {
    // Make sure we have min/max data available for the selected metric if required
    metricValues.forEach((metric) => {
      if (metric.type === METRIC_SUMMARY_TYPES.MIN || metric.type === METRIC_SUMMARY_TYPES.MAX) {
        this.ensureMetricMinMaxAvailable(metric.name);
      }
    });
    this.setState({ selectedMetrics: metricValues });
  };

  ensureMetricMinMaxAvailable(metricName) {
    const { runUuids, minMetricsByRun } = this.props;
    runUuids.forEach((runUuid) => {
      if ((minMetricsByRun[runUuid] && minMetricsByRun[runUuid][metricName]) === undefined) {
        this.props.getMetricHistoryApi(runUuid, metricName);
      }
    });
  }

  onClearAllSelect = () => {
    this.setState({ selectedParamKeys: [], selectedMetrics: [] });
  };

  render() {
    const { runUuids, allParamKeys, allMetricKeys, intl } = this.props;
    const { selectedParamKeys, selectedMetrics } = this.state;
    return (
      <div className='parallel-coordinates-plot-panel'>
        <ParallelCoordinatesPlotControls
          paramKeys={allParamKeys}
          metricKeys={allMetricKeys}
          selectedParamKeys={selectedParamKeys}
          selectedMetrics={selectedMetrics}
          handleMetricsSelectChange={this.handleMetricsSelectChange}
          handleParamsSelectChange={this.handleParamsSelectChange}
          onClearAllSelect={this.onClearAllSelect}
        />
        {!_.isEmpty(selectedParamKeys) || !_.isEmpty(selectedMetrics) ? (
          <ParallelCoordinatesPlotView
            runUuids={runUuids}
            axes={[
              ...selectedParamKeys.map(
                (paramName) => new Axis(paramName, paramName, AXIS_TYPE.PARAM),
              ),
              ...selectedMetrics.map(
                (metric) =>
                  new Axis(
                    metricLabel(intl, metric.name, metric.type),
                    metric.name,
                    AXIS_TYPE.METRIC,
                    metric.type,
                  ),
              ),
            ]}
          />
        ) : (
          <Empty style={{ width: '100%', height: '100%' }} />
        )}
      </div>
    );
  }

  static asLatestMetricValues(metrics) {
    return metrics.map((metricName) => {
      return {
        name: metricName,
        type: METRIC_SUMMARY_TYPES.LATEST,
      };
    });
  }
}

export const getDiffParams = (allParamKeys, runUuids, paramsByRunUuid) => {
  const diffParamKeys = [];
  allParamKeys.forEach((param) => {
    // collect all values for this param
    const paramVals = runUuids.map(
      (runUuid) => paramsByRunUuid[runUuid][param] && paramsByRunUuid[runUuid][param].value,
    );
    if (!paramVals.every((x, i, arr) => x === arr[0])) diffParamKeys.push(param);
  });
  return diffParamKeys;
};

const mapStateToProps = (state, ownProps) => {
  const { runUuids } = ownProps;
  const allParamKeys = getAllParamKeysByRunUuids(runUuids, state);
  const allMetricKeys = getAllMetricKeysByRunUuids(runUuids, state);
  const sharedMetricKeys = getSharedMetricKeysByRunUuids(runUuids, state);
  const { paramsByRunUuid } = state.entities;
  const diffParamKeys = getDiffParams(allParamKeys, runUuids, paramsByRunUuid);
  const minMetricsByRun = {};
  runUuids.forEach((runUuid) => {
    minMetricsByRun[runUuid] = getMinMetrics(runUuid, state);
  });

  return {
    allParamKeys,
    allMetricKeys,
    minMetricsByRun,
    sharedMetricKeys,
    diffParamKeys,
  };
};
const mapDispatchToProps = { getMetricHistoryApi };

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(injectIntl(ParallelCoordinatesPlotPanel));
