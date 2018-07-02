/*
 * Copyright (C) 2018 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import I18n from 'i18n!discussion_row'

import React, { Component } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { DragSource, DropTarget } from 'react-dnd';
import { findDOMNode } from 'react-dom'
import { func, bool, string, arrayOf } from 'prop-types'

import $ from 'jquery'
import 'jquery.instructure_date_and_time'

import Badge from '@instructure/ui-core/lib/components/Badge'
import Container from '@instructure/ui-core/lib/components/Container'
import Grid, { GridCol, GridRow} from '@instructure/ui-core/lib/components/Grid'
import IconAssignmentLine from 'instructure-icons/lib/Line/IconAssignmentLine'
import IconBookmarkLine from 'instructure-icons/lib/Line/IconBookmarkLine'
import IconBookmarkSolid from 'instructure-icons/lib/Solid/IconBookmarkSolid'
import IconCopySolid from 'instructure-icons/lib/Solid/IconCopySolid'
import IconLock from 'instructure-icons/lib/Line/IconLockLine'
import IconLtiLine from 'instructure-icons/lib/Line/IconLtiLine'
import IconPinLine from 'instructure-icons/lib/Line/IconPinLine'
import IconPinSolid from 'instructure-icons/lib/Solid/IconPinSolid'
import IconPublishSolid from 'instructure-icons/lib/Solid/IconPublishSolid'
import IconTrashSolid from 'instructure-icons/lib/Solid/IconTrashSolid'
import IconUnlock from 'instructure-icons/lib/Line/IconUnlockLine'
import IconUnpublishedLine from 'instructure-icons/lib/Line/IconUnpublishedLine'
import IconUpdownLine from 'instructure-icons/lib/Line/IconUpdownLine'
import ScreenReaderContent from '@instructure/ui-core/lib/components/ScreenReaderContent'
import Text from '@instructure/ui-core/lib/components/Text'
import { MenuItem } from '@instructure/ui-core/lib/components/Menu'

import DiscussionModel from 'compiled/models/DiscussionTopic'
import actions from '../actions'
import compose from '../../shared/helpers/compose'
import CourseItemRow from '../../shared/components/CourseItemRow'
import CyoeHelper from '../../shared/conditional_release/CyoeHelper'
import discussionShape from '../../shared/proptypes/discussion'
import masterCourseDataShape from '../../shared/proptypes/masterCourseData'
import propTypes from '../propTypes'
import SectionsTooltip from '../../shared/SectionsTooltip'
import select from '../../shared/select'
import ToggleIcon from '../../shared/components/ToggleIcon'
import UnreadBadge from '../../shared/components/UnreadBadge'
import { makeTimestamp } from '../../shared/date-utils'

const dragTarget = {
  beginDrag (props) {
    return props.discussion
  },
}

const dropTarget = {
  hover(props, monitor, component) {
    const dragIndex = props.getDiscussionPosition(monitor.getItem())
    const hoverIndex = props.getDiscussionPosition(props.discussion)
    if (dragIndex === undefined || hoverIndex === undefined) {
      return
    }
    if (dragIndex === hoverIndex) {
      return
    }
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect() // eslint-disable-line
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
    const clientOffset = monitor.getClientOffset()
    const hoverClientY = clientOffset.y - hoverBoundingRect.top

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return
    }
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return
    }
    props.moveCard(dragIndex, hoverIndex)
  },
}

export class DiscussionRow extends Component {
  static propTypes = {
    canPublish: bool.isRequired,
    cleanDiscussionFocus: func.isRequired,
    connectDragPreview: func,
    connectDragSource: func,
    connectDropTarget: func,
    contextType: string.isRequired,
    deleteDiscussion: func.isRequired,
    discussion: discussionShape.isRequired,
    discussionTopicMenuTools: arrayOf(propTypes.discussionTopicMenuTools),
    displayDeleteMenuItem: bool.isRequired,
    displayDuplicateMenuItem: bool.isRequired,
    displayLockMenuItem: bool.isRequired,
    displayMasteryPathsMenuItem: bool,
    displayManageMenu: bool.isRequired,
    displayPinMenuItem: bool.isRequired,
    draggable: bool,
    duplicateDiscussion: func.isRequired,
    isDragging: bool,
    masterCourseData: masterCourseDataShape,
    moveCard: func, // eslint-disable-line
    onMoveDiscussion: func,
    onSelectedChanged: func,
    toggleSubscriptionState: func.isRequired,
    rowRef: func,
    updateDiscussion: func.isRequired,
  }

  static defaultProps = {
    connectDragPreview (component) {return component},
    connectDragSource (component) {return component},
    connectDropTarget (component) {return component},
    discussionTopicMenuTools: [],
    draggable: false,
    isDragging: false,
    masterCourseData: null,
    displayMasteryPathsMenuItem: false,
    moveCard: () => {},
    onMoveDiscussion: null,
    onSelectedChanged () {},
    rowRef () {},
  }

  onManageDiscussion = (e, { action, id, menuTool }) => {
    switch (action) {
     case 'duplicate':
       this.props.duplicateDiscussion(id)
       break
     case 'moveTo':
       this.props.onMoveDiscussion({ id, title: this.props.discussion.title })
       break
     case 'togglepinned':
       this.props.updateDiscussion(this.props.discussion, { pinned: !this.props.discussion.pinned },
         this.makePinSuccessFailMessages(this.props.discussion), 'manageMenu')
       break
     case 'delete':
       this.props.deleteDiscussion(this.props.discussion)
       break
     case 'togglelocked':
       this.props.updateDiscussion(this.props.discussion, { locked: !this.props.discussion.locked },
         this.makeLockedSuccessFailMessages(this.props.discussion), 'manageMenu')
       break
     case 'masterypaths':
       // This is terrible
       const returnTo = encodeURIComponent(window.location.pathname)
       window.location =
         `discussion_topics/${this.props.discussion.id}/edit?return_to=${returnTo}#mastery-paths-editor`
       break
     case 'ltiMenuTool':
        window.location = `${menuTool.base_url}&discussion_topics[]=${id}`
        break
     default:
       throw new Error(I18n.t('Unknown manage discussion action encountered'))
    }
  }

  makePinSuccessFailMessages = () => {
    const successMessage = this.props.discussion.pinned ?
      I18n.t('Unpin of discussion %{title} succeeded', { title: this.props.discussion.title }) :
      I18n.t('Pin of discussion %{title} succeeded', { title: this.props.discussion.title })
    const failMessage = this.props.discussion.pinned ?
      I18n.t('Unpin of discussion %{title} failed', { title: this.props.discussion.title }) :
      I18n.t('Pin of discussion %{title} failed', { title: this.props.discussion.title })
    return { successMessage, failMessage }
  }

  makeLockedSuccessFailMessages = () => {
    const successMessage = this.props.discussion.locked ?
      I18n.t('Unlock discussion %{title} succeeded', { title: this.props.discussion.title }) :
      I18n.t('Lock discussion %{title} succeeded', { title: this.props.discussion.title })
    const failMessage = this.props.discussion.locked ?
      I18n.t('Unlock discussion %{title} failed', { title: this.props.discussion.title }) :
      I18n.t('Lock discussion %{title} failed', { title: this.props.discussion.title })
    return { successMessage, failMessage }
  }

  readCount = () => {
  const readCount = this.props.discussion.discussion_subentry_count > 0
    ? (
      <UnreadBadge
        unreadCount={this.props.discussion.unread_count}
        unreadLabel={I18n.t('%{count} unread replies', { count: this.props.discussion.unread_count })}
        totalCount={this.props.discussion.discussion_subentry_count}
        totalLabel={I18n.t('%{count} replies', { count: this.props.discussion.discussion_subentry_count })}
      />
    )
    : null
    return readCount
  }

  subscribeButton = () => (
    <ToggleIcon
      toggled={this.props.discussion.subscribed}
      OnIcon={
        <Text color="success">
          <IconBookmarkSolid title={I18n.t('Unsubscribe from %{title}', { title: this.props.discussion.title })} />
        </Text>
      }
      OffIcon={
        <Text color="brand">
          <IconBookmarkLine title={I18n.t('Subscribe to %{title}', { title: this.props.discussion.title })} />
        </Text>
      }
      onToggleOn={() => this.props.toggleSubscriptionState(this.props.discussion)}
      onToggleOff={() => this.props.toggleSubscriptionState(this.props.discussion)}
      disabled={this.props.discussion.subscription_hold !== undefined}
      className="subscribe-button"
    />
  )

  publishButton = () => (
    this.props.canPublish
    ? (<ToggleIcon
         toggled={this.props.discussion.published}
         disabled={!this.props.discussion.can_unpublish && this.props.discussion.published}
         OnIcon={
           <Text color="success">
             <IconPublishSolid title={I18n.t('Unpublish %{title}', { title: this.props.discussion.title })} />
           </Text>
         }
         OffIcon={
           <Text color="secondary">
             <IconUnpublishedLine title={I18n.t('Publish %{title}', { title: this.props.discussion.title })} />
           </Text>
         }
         onToggleOn={() => this.props.updateDiscussion(this.props.discussion, {published: true}, {})}
         onToggleOff={() => this.props.updateDiscussion(this.props.discussion, {published: false}, {})}
         className="publish-button"
       />)
    : null
  )

  pinMenuItemDisplay = () => {
    if (this.props.discussion.pinned) {
      return (
        <span aria-hidden='true'>
          <IconPinLine />&nbsp;&nbsp;{I18n.t('Unpin')}
        </span>
      )
    } else {
      return (
        <span aria-hidden='true'>
          <IconPinSolid />&nbsp;&nbsp;{I18n.t('Pin')}
        </span>
      )
    }
  }

  createMenuItem = (itemKey, visibleItemLabel, screenReaderContent) => (
      <MenuItem
        key={itemKey}
        value={{ action: itemKey, id: this.props.discussion.id }}
        id={`${itemKey}-discussion-menu-option`}
      >
        {visibleItemLabel}
        <ScreenReaderContent>
          {screenReaderContent}
        </ScreenReaderContent>
      </MenuItem>
  )

  renderIcon = () => {
    if(this.props.discussion.assignment) {
      if(this.props.discussion.published) {
        return (
          <Text color="success" size="large">
            <IconAssignmentLine />
          </Text>
        )
      } else {
        return (
          <Text color="secondary" size="large">
            <IconAssignmentLine />
          </Text>
        )
      }
    }
    return null
  }

  renderMenuToolIcon (menuTool) {
    if (menuTool.canvas_icon_class){
      return <span><i className={menuTool.canvas_icon_class}/>&nbsp;&nbsp;{menuTool.title}</span>
    } else if (menuTool.icon_url) {
      return <span><img className="icon" alt="" src={menuTool.icon_url} />&nbsp;&nbsp;{menuTool.title}</span>
    } else {
      return <span><IconLtiLine />&nbsp;&nbsp;{menuTool.title}</span>
    }
  }

  renderMenuList = () => {
    const discussionTitle = this.props.discussion.title
    const menuList = []
    if (this.props.displayLockMenuItem) {
      const menuLabel = this.props.discussion.locked ? I18n.t('Open for comments')
        : I18n.t('Close for comments')
      const screenReaderContent = this.props.discussion.locked
        ? I18n.t('Open discussion %{title} for comments', { title: discussionTitle })
        : I18n.t('Close discussion %{title} for comments', { title: discussionTitle })
      const icon = this.props.discussion.locked ? ( <IconUnlock /> ) : ( <IconLock /> )
      menuList.push(this.createMenuItem(
        'togglelocked',
        ( <span aria-hidden='true'> {icon}&nbsp;&nbsp;{menuLabel} </span> ),
        screenReaderContent
      ))
    }

    if (this.props.displayPinMenuItem) {
      const screenReaderContent = this.props.discussion.pinned
        ? I18n.t('Unpin discussion %{title}', { title: discussionTitle })
        : I18n.t('Pin discussion %{title}', { title: discussionTitle })
      menuList.push(this.createMenuItem(
        'togglepinned',
        this.pinMenuItemDisplay(),
        screenReaderContent
      ))
    }

    if (this.props.onMoveDiscussion) {
      menuList.push(this.createMenuItem(
        'moveTo',
        ( <span aria-hidden='true'><IconUpdownLine />&nbsp;&nbsp;{I18n.t('Move To')}</span> ),
        I18n.t('Move discussion %{title}', { title: discussionTitle })
      ))
    }

    if (this.props.displayDuplicateMenuItem) {
      menuList.push(this.createMenuItem(
        'duplicate',
        ( <span aria-hidden='true'><IconCopySolid />&nbsp;&nbsp;{I18n.t('Duplicate')}</span> ),
        I18n.t('Duplicate discussion %{title}', { title: discussionTitle })
      ))
    }

    // This returns an empty struct if assignment_id is falsey
    if (this.props.displayMasteryPathsMenuItem) {
      menuList.push(this.createMenuItem(
        'masterypaths',
        ( <span aria-hidden='true'>{ I18n.t('Mastery Paths') }</span> ),
        I18n.t('Edit Mastery Paths for %{title}', { title: discussionTitle })
      ))
    }

    if(this.props.discussionTopicMenuTools.length > 0) {
      this.props.discussionTopicMenuTools.forEach((menuTool) =>  {
        menuList.push(
          <MenuItem
            key={menuTool.base_url}
            value={{ action: 'ltiMenuTool', id: this.props.discussion.id, title: this.props.discussion.title, menuTool }}
            id="menuTool-discussion-menu-option"
          >
            <span aria-hidden='true'>
              {this.renderMenuToolIcon(menuTool)}
            </span>
            <ScreenReaderContent>{ menuTool.title }</ScreenReaderContent>
          </MenuItem>
        )
      })
    }

    if (this.props.displayDeleteMenuItem) {
      menuList.push(this.createMenuItem(
        'delete',
        ( <span aria-hidden='true'><IconTrashSolid />&nbsp;&nbsp;{I18n.t('Delete')}</span> ),
        I18n.t('Delete discussion %{title}', { title: discussionTitle })
      ))
    }

    return menuList
  }

  renderSectionsTooltip = () => {
    if (this.props.contextType === "group" || this.props.discussion.assignment ||
        this.props.discussion.group_category_id) {
      return null
    }

    return (
      <SectionsTooltip
        totalUserCount={this.props.discussion.user_count}
        sections={this.props.discussion.sections}
      />
    )
  }

  render () {
    // necessary because discussions return html from RCE
    const contentWrapper = document.createElement('span')
    contentWrapper.innerHTML = this.props.discussion.message
    const textContent = contentWrapper.textContent.trim()
    const delayedLabel = I18n.t('Delayed until:');
    const postedAtLabel = I18n.t('Posted on:');

    return this.props.connectDragPreview (
      <div>
        <Grid startAt="medium" vAlign="middle" colSpacing="none">
          <GridRow>
          {/* discussion topics is different for badges so we use our own read indicator instead of passing to isRead */}
            <GridCol width="auto">
            {!(this.props.discussion.read_state === "read")
              ? <Badge margin="0 small x-small 0" standalone type="notification" />
              : <Container display="block" margin="0 small x-small 0">
            <Container display="block" margin="0 small x-small 0" />
            </Container>}
            </GridCol>
            <GridCol>
              <CourseItemRow
                ref={this.props.rowRef}
                className="ic-discussion-row"
                key={this.props.discussion.id}
                id={this.props.discussion.id}
                isDragging={this.props.isDragging}
                focusOn={this.props.discussion.focusOn}
                draggable={this.props.draggable}
                connectDragSource={this.props.connectDragSource}
                connectDropTarget={this.props.connectDropTarget}
                icon={this.renderIcon() }
                isRead
                author={this.props.discussion.author}
                title={this.props.discussion.title}
                body={textContent ? <div className="ic-discussion-row__content">{textContent}</div> : null}
                sectionToolTip={this.renderSectionsTooltip()}
                itemUrl={this.props.discussion.html_url}
                onSelectedChanged={this.props.onSelectedChanged}
                peerReview={this.props.discussion.assignment ? this.props.discussion.assignment.peer_reviews : false}
                showManageMenu={this.props.displayManageMenu}
                onManageMenuSelect={this.onManageDiscussion}
                clearFocusDirectives={this.props.cleanDiscussionFocus}
                manageMenuOptions={this.renderMenuList}
                masterCourse={{
                  courseData: this.props.masterCourseData || {},
                  getLockOptions: () => ({
                    model: new DiscussionModel(this.props.discussion),
                    unlockedText: I18n.t('%{title} is unlocked. Click to lock.', {title: this.props.discussion.title}),
                    lockedText: I18n.t('%{title} is locked. Click to unlock', {title: this.props.discussion.title}),
                    course_id: this.props.masterCourseData.masterCourse.id,
                    content_id: this.props.discussion.id,
                    content_type: 'discussion_topic',
                  }),
                }}
                metaContent={
                  <div>
                    <span className="ic-item-row__meta-content-heading">
                      <Text size="small" as="p">{
                        makeTimestamp(this.props.discussion,
                          delayedLabel,
                          postedAtLabel
                        ).title
                      }</Text>
                    </span>
                    <Text color="secondary" size="small" as="p">
                      {$.datetimeString(
                        makeTimestamp(this.props.discussion,
                          delayedLabel,
                          postedAtLabel
                        ).date, {format: 'medium'}
                      )}
                    </Text>
                  </div>
                }
                actionsContent={[this.readCount(), this.publishButton(), this.subscribeButton()]}
              />
            </GridCol>
          </GridRow>
        </Grid>
      </div>
    )
  }
}

const mapDispatch = (dispatch) => {
  const actionKeys = [
    'cleanDiscussionFocus',
    'duplicateDiscussion',
    'toggleSubscriptionState',
    'updateDiscussion',
  ]
  return bindActionCreators(select(actions, actionKeys), dispatch)
}

const mapState = (state, ownProps) => {
  const { discussion } = ownProps
  const cyoe = CyoeHelper.getItemData(discussion.assignment_id)
  const propsFromState = {
    canPublish: state.permissions.publish,
    contextType: state.contextType,
    discussionTopicMenuTools: state.discussionTopicMenuTools,
    displayDeleteMenuItem: !(discussion.is_master_course_child_content && discussion.restricted_by_master_course),
    displayDuplicateMenuItem: state.permissions.manage_content,
    displayLockMenuItem: discussion.can_lock,
    displayMasteryPathsMenuItem: cyoe.isCyoeAble,
    displayManageMenu: discussion.permissions.delete,
    displayPinMenuItem: state.permissions.moderate,
    masterCourseData: state.masterCourseData,
  }
  return Object.assign({}, ownProps, propsFromState)
}

/* eslint-disable new-cap */
export const DraggableDiscussionRow = compose(
    DropTarget('Discussion', dropTarget, dConnect => ({
      connectDropTarget: dConnect.dropTarget()
    })),
    DragSource('Discussion', dragTarget, (dConnect, monitor) => ({
      connectDragSource: dConnect.dragSource(),
      isDragging: monitor.isDragging(),
      connectDragPreview: dConnect.dragPreview(),
    }))
  )(DiscussionRow)
export const ConnectedDiscussionRow = connect(mapState, mapDispatch)(DiscussionRow)
export const ConnectedDraggableDiscussionRow = connect(mapState, mapDispatch)(DraggableDiscussionRow)
