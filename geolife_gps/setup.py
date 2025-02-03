from setuptools import setup, find_packages

setup(
    name="geolife_gps",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        'pandas',
        'numpy',
        'matplotlib',
        'pymongo',
    ],
    author="Usman Ahmed",
    author_email="gorayausman061@gmail.com",
    description="A package for analyzing GeoLife GPS trajectories",
    keywords="gps, trajectory, geolocation",
    python_requires='>=3.6'
)