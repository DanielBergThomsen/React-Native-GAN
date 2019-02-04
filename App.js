import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, TouchableOpacity, PermissionsAndroid, ToastAndroid} from 'react-native';

import Gaussian from 'gaussian';
import {TensorFlow, TfImageRecognition} from 'react-native-tensorflow';

import Canvas, { Image } from 'react-native-canvas';

import RNFS from 'react-native-fs';
import fetch_blob from 'react-native-fetch-blob';

type Props = {};

// object used to generate gaussian noise vector
var distribution = Gaussian(0, 1);

// load weights and architecture
const tf = new TensorFlow('model.pb');

// reference to save handwritten digit image
var outputImage;

export default class App extends Component<Props> {

	constructor()
	{
		super();
		this.canvas = React.createRef();
	}

	// render given image array on canvas
	renderImage(encodedImg)
	{
		const canvas  = this.canvas.current;
		canvas.width  = 280;
		canvas.height = 280;
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = 'black';

		// clear canvas
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = 'white';

		// iterate through 28 x 28 image and draw individual pixel values
		for(var i = 0; i < 28; ++i)
		{
			for(var j = 0; j < 28; ++j)
			{
				// draw using network activation as alpha value
				ctx.globalAlpha = (encodedImg[i*28 + j] + 1) / 2;
				ctx.fillRect(j*10, i*10, 10, 10);
			}
		}

		// compute base64 encoded png
		outputImage = canvas.toDataURL();
	}

	// initial drawing method
	componentDidMount()
	{
		const canvas  = this.canvas.current;
		canvas.width  = 280;
		canvas.height = 280;
		const ctx = canvas.getContext("2d");

		var img = new Image(canvas, 280, 280);
		img.addEventListener('load', () => 
		{
			ctx.drawImage(img, 0, 0);
			outputImage = canvas.toDataURL();
		});

		// base64 encoding for placeholder image
		img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARgAAAEYBAMAAAB1oPS/AAAAG1BMVEUAAAD///9/f39fX18fHx/f39+fn5+/v78/Pz9yEJNOAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADEklEQVR4nO3Vz1PTQBjG8bftlvYIWCXHDKJeow4/juko6pERa3tEGKlHBizlGMDO+Gf7vrsJaeyI6QHHw/dzeGm2L9tnN91UBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYGnNzc2n6X0NvbozVRob9875J+3jzfEgqx1ma64+QJhEpPWodpjRXH2YMPLsfwrTv+df/3mYRhrLm1jv1/hEr25OT9Ki6me0xt9EnLVtVcPsXOpgU/9kUjbmwxbGz9bSN2/04rZ2mL5bff85lu7nvd0zWTn8uVNUFV3ubR9J98AydNaUhCr7F7dfM+l3Lm7WpWyU2cnt1Idxw72dkTR16Iuu86J2mBcuOtQ/+/r6XGZ+Q0JVj3XwYx6msjMfddk96Z+LXM81Op2oE1uYtkZ4mXZXdfRMXK0nhD9NkdvILJOF8FXyqtb94GKYlo2cSl9X3s7KxqZupzZrmG29XjmSSNyn1dD99zBPX7+aJO6JvbatbKQzPz4rGiIbzBbD6PKty777naRs9K97Fka3zGIdS+voSlbiWmGml8eJuKj4jHbWsTsmoUo4JJ1kMUx+DPu2/rhs9Ls0sjA2gd6dXR18nm/eX8P4VYVbal/MtUR2N+wJG2r+GfFimIZN3/g9TNywOR5ZmCgM9v1m9+tkqYQpHh/dL9ld/WMYv9aFnYnzLdAwozBvJ5np1c7SYYo7k3/dQu35Jh8mWrhN11IN007CfMVt0rPUPHqugWqd7EqY07vRXlkjvwFOT6irhNGDYmeuDBMa/bAPY7Pp2eoeXGmger/982Gu03wwXIa64T/TgnWiYvP8onv+RRkmNHZ7RRibzWbXg+1GZ0uHaeqKP9iD+/1ZXtX6d3u2yTh15/r22P+Tr88y6yjD5I067DILo7O5qTXrNMN46TCyPZwcyrvB5EmaV9WbTYeZJtuYJBpmf3gpeW0NJvoQnvvOhMbWYDpI/G/T9nBgb7zUEs7Ckj68tWQ/5K76wbSs8xdlR6XR/Ugr1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/Nd+AfFQkT18Fq+ZAAAAAElFTkSuQmCC';

	}

	render()
	{
		return (
			<View style={styles.container}>
				<Canvas
					ref={ this.canvas }
				/>

				{/* button for generating handwritten digit */}
				<TouchableOpacity 
					onPress={ async () => 
					{
						// generate gaussian noise vector
						const noise = distribution.random(100);

						// make sure network is ready for new input
						await tf.reset();

						// feed network and run prediction on noise vector
						await tf.feed({name: "dense_input", data: noise, shape: [1, 100], dtype: "float"});
						await tf.run(['reshape/Reshape']);
						const encodedImg = await tf.fetch('reshape/Reshape');

						this.renderImage(encodedImg);
					}}
					style={ {backgroundColor: "rgba(63, 191, 63, 1)", borderRadius: 10, width: 300, height: 50, alignItems: "center", justifyContent: "center", marginVertical: 10} }
				>
				<Text style={ { color: "white" } } >Generate noise vector</Text>
			</TouchableOpacity>

			{/* button for saving image to gallery */}
			<TouchableOpacity 
					onPress={ async () => 
					{
						// ask user for permission before attempting to save image to gallery
						const granted = await PermissionsAndroid.request(
							PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
							{
								'title': 'Digit Generator External Storage Write Permission',
								'message': 'Digit Generator needs access to external storage to save digit image'
							}
						);

						if(granted === PermissionsAndroid.RESULTS.GRANTED)
						{
								// save image to seperate directory in DCIM
								const dirs = fetch_blob.fs.dirs;
								const file_path = dirs.DCIMDir + '/DigitGenerator/digit.png';
								await RNFS.mkdir(dirs.DCIMDir + '/DigitGenerator');
								var file = await outputImage;

								// split base64 encoded image for writing
								file = file.split('data:image/png;base64,')[1];

								// write image to external storage
								await RNFS.writeFile(file_path, file, 'base64');

								// connect media scanner and scan file so it shows up in gallery
								fetch_blob.fs.scanFile([{path: file_path}]);

								ToastAndroid.show('File written to: ' + file_path, ToastAndroid.LONG);
						}else
						{
							ToastAndroid.show('You need to grant write permissions to save the file.', ToastAndroid.LONG);
						}
					}}
					style={ {backgroundColor: "rgba(63, 191, 63, 1)", borderRadius: 10, width: 300, height: 50, alignItems: "center", justifyContent: "center", marginVertical: 10} }
				>
				<Text style={ { color: "white" } } >Save image to gallery</Text>
			</TouchableOpacity>
		</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#F5FCFF',
	},
	welcome: {
		fontSize: 20,
		textAlign: 'center',
		margin: 10,
	},
	instructions: {
		textAlign: 'center',
		color: '#333333',
		marginBottom: 5,
	},
});
