#
# Copyright (C) 2014 - present Instructure, Inc.
#
# This file is part of Canvas.
#
# Canvas is free software: you can redistribute it and/or modify it under
# the terms of the GNU Affero General Public License as published by the Free
# Software Foundation, version 3 of the License.
#
# Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
# WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
# A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
# details.
#
# You should have received a copy of the GNU Affero General Public License along
# with this program. If not, see <http://www.gnu.org/licenses/>.
#

require File.expand_path(File.dirname(__FILE__) + '/../../api_spec_helper')

describe Quizzes::QuizAssignmentOverridesController, type: :request do

  describe '[GET] /courses/:course_id/quizzes/assignment_overrides' do
    before do
      course_with_teacher(:active_all => true)
      @quiz  = @course.quizzes.create! title: 'title'
      @quiz.workflow_state = 'available'
      @quiz.build_assignment
      @quiz.publish!
      @quiz.reload
    end

    it "should require authorization" do
      user_factory(active_all: true) # not enrolled

      raw_api_call(:get, "/api/v1/courses/#{@course.id}/quizzes/assignment_overrides",
                  {:controller=>"quizzes/quiz_assignment_overrides", :action => "index", :format => "json", :course_id => "#{@course.id}"},
                  {:quiz_assignment_overrides => [{ :quiz_ids => [@quiz.id] }] })

      expect(response.code).to eq '401'
    end

    it "should include visible overrides" do
      due_at = 5.minutes.ago

      assignment_override_model({
        set: @course.default_section,
        quiz: @quiz,
        due_at: due_at
      })

      expect(@quiz.reload.assignment_overrides.count).to eq 1

      json = api_call(:get, "/api/v1/courses/#{@course.id}/quizzes/assignment_overrides", {
        :controller => 'quizzes/quiz_assignment_overrides',
        :action => 'index',
        :format => 'json',
        :course_id => @course.id.to_s
      }, {
        quiz_assignment_overrides: [{
          quiz_ids: [@quiz].map(&:id).map(&:to_s)
        }]
      })

      expect(json).to have_key('quiz_assignment_overrides')
      expect(json['quiz_assignment_overrides'].size).to eq 1
      json['quiz_assignment_overrides'][0].tap do |override|
        expect(override.keys.sort).to eq %w[ all_dates due_dates quiz_id ]
        expect(override['quiz_id']).to eq @quiz.id
        expect(override['due_dates'].length).to eq 1
        expect(override['due_dates'][0]['due_at']).to eq due_at.iso8601
      end
    end
  end
end
