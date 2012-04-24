# -*- coding: utf-8 -*-

import flask


app = flask.Flask(__name__)


@app.route('/')
def index():
    return flask.render_template('index.html')

@app.route('/test')
def test():
    return flask.render_template('test.html')


if __name__ == '__main__':
    app.run(debug=True)
