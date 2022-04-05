import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom';
import { injectIntl, FormattedMessage } from 'react-intl';
import qs from 'qs';
import { Progress, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import Utils from '../../common/utils/Utils';
import { Button } from '../../shared/building_blocks/Button';
import Routes from '../routes';
import './MetricView.css';
import { Experiment } from '../sdk/MlflowMessages';
import { getExperiment, getRunInfo, getRunTags } from '../reducers/Reducers';
import MetricsPlotPanel, { METRICS_PLOT_POLLING_INTERVAL_MS } from './MetricsPlotPanel';
import { PageHeader } from '../../shared/building_blocks/PageHeader';
import { IconButton } from '../../common/components/IconButton';

export class MetricViewImpl extends Component {
  static propTypes = {
    experiment: PropTypes.instanceOf(Experiment).isRequired,
    runUuids: PropTypes.arrayOf(PropTypes.string).isRequired,
    numCompletedRuns: PropTypes.number.isRequired,
    runNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    metricKey: PropTypes.string.isRequired,
    plotKeys: PropTypes.arrayOf(PropTypes.number).isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    intl: PropTypes.shape({ formatMessage: PropTypes.func.isRequired }).isRequired,
  };

  getRunsLink() {
    const { experiment, runUuids, runNames } = this.props;
    const experimentId = experiment.getExperimentId();

    if (!runUuids || runUuids.length === 0) {
      return null;
    }

    return runUuids.length === 1 ? (
      <Link to={Routes.getRunPageRoute(experimentId, runUuids[0])}>{runNames[0]}</Link>
    ) : (
      <Link to={Routes.getCompareRunPageRoute(runUuids, experimentId)}>
        <FormattedMessage
          defaultMessage='Comparing {length} Runs'
          description='Breadcrumb title for metrics page when comparing multiple runs'
          values={{
            length: runUuids.length,
          }}
        />
      </Link>
    );
  }

  addPlot = () => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const nextKey = Math.max(...plotKeys) + 1;
    const plotStates = [
      ...plotKeys.map((key) => Utils.getMetricPlotStateFromUrl(location.search, key)),
      { key: nextKey },
    ];
    history.replace(
      Routes.getMetricPageRoute(runUuids, metricKey, experiment.experiment_id, plotStates),
    );
  };

  removePlot = (ev) => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const experimentId = experiment.experiment_id;
    const plotKey = parseInt(ev.currentTarget.dataset.plotkey, 10);
    const plotStates = plotKeys
      .filter((key) => key !== plotKey)
      .map((key) => Utils.getMetricPlotStateFromUrl(location.search, key));
    history.replace(Routes.getMetricPageRoute(runUuids, metricKey, experimentId, plotStates));
  };

  updateUrlState = (plotKey, newState) => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const experimentId = experiment.experiment_id;
    const plotStates = plotKeys.map((key) => {
      if (key === plotKey) {
        return newState;
      }
      return Utils.getMetricPlotStateFromUrl(location.search, key);
    });
    history.replace(Routes.getMetricPageRoute(runUuids, metricKey, experimentId, plotStates));
  };

  render() {
    const { experiment, runUuids, numCompletedRuns, metricKey, location, plotKeys } = this.props;
    const numRuns = runUuids.length;
    const experimentId = experiment.experiment_id;
    let metricKeys = new Set();
    plotKeys.forEach((plotKey) => {
      const { selectedMetricKeys } = Utils.getMetricPlotStateFromUrl(location.search, plotKey);
      metricKeys = new Set([...metricKeys, ...selectedMetricKeys]);
    });
    const [firstMetric] = metricKeys;
    const title =
      metricKeys.size > 1 ? (
        <FormattedMessage defaultMessage='Metrics' description='Title for metrics page' />
      ) : (
        firstMetric
      );
    const breadcrumbs = [
      <Link to={Routes.getExperimentPageRoute(experimentId)}>{experiment.getName()}</Link>,
      this.getRunsLink(),
      title,
    ];
    const completedRunsTooltipText = (
      <FormattedMessage
        // eslint-disable-next-line max-len
        defaultMessage='MLflow UI automatically fetches metric histories for active runs and updates the metrics plot with a {interval} second interval.'
        description='Helpful tooltip message to explain the automatic metrics plot update'
        values={{ interval: Math.round(METRICS_PLOT_POLLING_INTERVAL_MS / 1000) }}
      />
    );
    return (
      <div>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <div className='inline-control metrics-run-info'>
          <div className='control-label'>
            <FormattedMessage
              defaultMessage='Completed Runs'
              // eslint-disable-next-line max-len
              description='Label for the progress bar to show the number of completed runs'
            />{' '}
            <Tooltip title={completedRunsTooltipText}>
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
          <Progress
            percent={Math.round((100 * numCompletedRuns) / numRuns)}
            format={() => `${numCompletedRuns}/${numRuns}`}
            status='normal'
          />
        </div>
        {plotKeys.map((plotKey) => (
          <Fragment key={plotKey}>
            <div className='metrics-plot-row'>
              <MetricsPlotPanel
                {...{
                  experimentId,
                  runUuids,
                  metricKey,
                  plotKey,
                  updateUrlState: this.updateUrlState,
                }}
              />
              <div className='metrics-plot-actions'>
                <IconButton
                  icon={<i className='far fa-trash-alt' />}
                  size='large'
                  onClick={this.removePlot}
                  data-plotkey={plotKey}
                  disabled={plotKeys.length < 2}
                  title={this.props.intl.formatMessage({
                    defaultMessage: 'Remove plot',
                    description: 'Button title for the button to remove a plot in the metric view',
                  })}
                />
              </div>
            </div>
          </Fragment>
        ))}
        <div className='metrics-view-actions'>
          <Button onClick={this.addPlot}>
            <FormattedMessage
              defaultMessage='Add plot'
              description='Button text to add a new plot to the metric view'
            />
          </Button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { experimentId, location, runUuids } = ownProps;
  const experiment = experimentId !== null ? getExperiment(experimentId, state) : null;
  const searchValues = qs.parse(location.search);
  const plotKeys = JSON.parse(searchValues['plot_keys']);
  const runNames = runUuids.map((runUuid) => {
    const tags = getRunTags(runUuid, state);
    return Utils.getRunDisplayName(tags, runUuid);
  });
  const numCompletedRuns = runUuids.filter(
    (runUuid) => getRunInfo(runUuid, state).status !== 'RUNNING',
  ).length;
  return { experiment, plotKeys, runNames, numCompletedRuns };
};

const MetricViewWithIntl = injectIntl(MetricViewImpl);
export const MetricView = withRouter(connect(mapStateToProps)(MetricViewWithIntl));
