# -*- coding: utf-8 -*-

import flask


app = flask.Flask(__name__)


@app.route('/')
def index():
    return flask.render_template('index.html')

@app.route('/2')
def index2():
    return flask.render_template('index2.html')


if __name__ == '__main__':
    app.run(debug=True)
